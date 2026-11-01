import { DEFAULT_LOCALE, translate, type MessageKey, type MessageParams } from "../../i18n";
import { fail, ok, type Result, type ToolError } from "../result";

export interface Base64Options {
  /** Base64URL alphabet (`-` and `_`, padding optional) instead of the standard one. */
  urlSafe?: boolean;
}

const message = (key: MessageKey, params?: MessageParams): string =>
  translate(DEFAULT_LOCALE, key, params);

const failure = (key: MessageKey, params?: MessageParams, position?: ToolError["position"]) =>
  fail<ToolError>({ kind: "validation", message: message(key, params), position });

/** `String.fromCharCode` over a large array overflows the call stack, so convert in chunks. */
function bytesToBinary(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return binary;
}

export function toUrlSafe(standard: string): string {
  return standard.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64URL to standard Base64, re-adding padding. Shared with the JWT decoder. */
export function fromUrlSafe(urlSafe: string): string {
  const standard = urlSafe.replace(/-/g, "+").replace(/_/g, "/");
  return standard + "=".repeat((4 - (standard.length % 4)) % 4);
}

export function encodeBytes(bytes: Uint8Array, { urlSafe = false }: Base64Options = {}): string {
  const standard = btoa(bytesToBinary(bytes));
  return urlSafe ? toUrlSafe(standard) : standard;
}

/** Text is encoded as UTF-8 first, so any Unicode input round-trips. */
export function encode(text: string, options?: Base64Options): string {
  return encodeBytes(new TextEncoder().encode(text), options);
}

const isWhitespace = (char: string) => /\s/.test(char);

/**
 * Decode to bytes with strict validation: unknown characters are reported with their
 * line and column, padding must be well formed, but missing padding is accepted.
 * Whitespace (including line breaks, as in MIME) is ignored.
 */
export function decodeToBytes(
  input: string,
  { urlSafe = false }: Base64Options = {},
): Result<Uint8Array, ToolError> {
  const alphabet = urlSafe ? /^[A-Za-z0-9\-_]$/ : /^[A-Za-z0-9+/]$/;
  let data = "";
  let padding = 0;
  let line = 1;
  let column = 0;

  for (const char of input) {
    if (char === "\n") {
      line += 1;
      column = 0;
      continue;
    }
    column += 1;
    if (isWhitespace(char)) continue;
    if (char === "=") {
      padding += 1;
      continue;
    }
    if (padding > 0 || !alphabet.test(char)) {
      // Data after a padding character is as wrong as an unknown character.
      return failure(
        padding > 0 ? "base64.invalidPadding" : "base64.invalidChar",
        { char, line, column },
        {
          line,
          column,
        },
      );
    }
    data += char;
  }

  if (padding > 2) return failure("base64.invalidPadding");
  if (padding > 0 && (data.length + padding) % 4 !== 0) return failure("base64.invalidPadding");
  if (data.length % 4 === 1) return failure("base64.invalidLength");

  try {
    const binary = atob(fromUrlSafe(data)); // maps -_ to +/ (a no-op for standard data) and pads
    return ok(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    return failure("base64.invalidLength");
  }
}

/** Decode Base64 to text. The bytes must be valid UTF-8 and a leading BOM is kept (exact round trip). */
export function decode(input: string, options?: Base64Options): Result<string, ToolError> {
  const bytes = decodeToBytes(input, options);
  if (!bytes.ok) return bytes;
  try {
    return ok(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes.value));
  } catch {
    return failure("base64.notUtf8");
  }
}

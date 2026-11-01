import { DEFAULT_LOCALE, translate, type MessageKey } from "../../../i18n";
import { fail, ok, type Result, type ToolError } from "../../../lib/result";

export const MAX_UUIDS = 1000;

export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** The parts of Web Crypto this module needs; injectable so the fallbacks can be tested. */
export type CryptoLike = Partial<Pick<Crypto, "randomUUID" | "getRandomValues">>;

const failure = (key: MessageKey) =>
  fail<ToolError>({ kind: "validation", message: translate(DEFAULT_LOCALE, key) });

const hex = (byte: number) => byte.toString(16).padStart(2, "0");

/** RFC 4122 version 4 from 16 random bytes. */
function uuidFromBytes(bytes: Uint8Array): string {
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(bytes, hex);
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}

/**
 * Generate `count` UUID v4. Uses crypto.randomUUID, falls back to getRandomValues, and reports
 * an error when neither exists. It never falls back to Math.random (PRD 3.4).
 */
export function generateUuids(
  count: number,
  crypto: CryptoLike | undefined = globalThis.crypto,
): Result<string[], ToolError> {
  if (!Number.isInteger(count) || count < 1 || count > MAX_UUIDS) {
    return failure("uuid.countInvalid");
  }
  const next =
    crypto?.randomUUID !== undefined
      ? () => crypto.randomUUID!()
      : crypto?.getRandomValues !== undefined
        ? () => {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues!(bytes);
            return uuidFromBytes(bytes);
          }
        : undefined;
  if (!next) return failure("uuid.noCrypto");
  return ok(Array.from({ length: count }, next));
}

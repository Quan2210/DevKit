import { DEFAULT_LOCALE, translate, type MessageKey } from "../../../../i18n";
import { fail, ok, type Result } from "../../../../lib/result";
import { hslToRgb } from "./convert";
import type { Color } from "./types";

const t = (key: MessageKey): string => translate(DEFAULT_LOCALE, key);

const invalid = (key: MessageKey = "color.invalid") =>
  fail({ kind: "validation" as const, message: t(key) });

const HEX = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)`;
const FUNCTION = /^(rgba?|hsla?)\(\s*([^()]*?)\s*\)$/i;

function parseHex(digits: string): Color {
  const full = digits.length <= 4 ? [...digits].map((char) => char + char).join("") : digits;
  const byte = (index: number) => parseInt(full.slice(index * 2, index * 2 + 2), 16);
  return { r: byte(0), g: byte(1), b: byte(2), a: full.length === 8 ? byte(3) / 255 : 1 };
}

/** Splits "a, b, c" / "a b c" / "a b c / d" into channel and alpha tokens; null when malformed. */
function splitArguments(body: string): { channels: string[]; alpha?: string } | null {
  const slash = body.split("/");
  if (slash.length > 2) return null;
  const head = slash[0]!.trim();
  const comma = head.includes(",");
  const channels = (comma ? head.split(",") : head.split(/\s+/)).map((part) => part.trim());
  if (channels.some((part) => part === "")) return null;
  if (comma && slash.length === 2) return null; // legacy syntax has no slash
  if (comma && channels.length === 4) return { channels: channels.slice(0, 3), alpha: channels[3] };
  if (slash.length === 2) return { channels, alpha: slash[1]!.trim() };
  return { channels };
}

const numberOnly = new RegExp(`^${NUMBER}$`);
const percentOnly = new RegExp(`^${NUMBER}%$`);

function readChannel(token: string, max: number): number | null {
  if (numberOnly.test(token)) return Number(token);
  if (percentOnly.test(token)) return (Number(token.slice(0, -1)) / 100) * max;
  return null;
}

function readAlpha(token: string | undefined): number | null {
  if (token === undefined) return 1;
  const value = readChannel(token, 1);
  return value === null || value < 0 || value > 1 ? null : value;
}

function parseFunction(name: string, body: string): Result<Color> {
  const parts = splitArguments(body);
  if (!parts || parts.channels.length !== 3) return invalid();
  const alpha = readAlpha(parts.alpha);
  if (alpha === null) return invalid("color.alphaRange");

  if (name.startsWith("rgb")) {
    const values = parts.channels.map((token) => readChannel(token, 255));
    if (values.some((value) => value === null)) return invalid();
    const [r, g, b] = values as number[];
    if ([r, g, b].some((value) => value! < 0 || value! > 255)) return invalid("color.channelRange");
    return ok({ r: r!, g: g!, b: b!, a: alpha });
  }

  const hueToken = parts.channels[0]!.replace(/deg$/i, "");
  if (!numberOnly.test(hueToken)) return invalid();
  const s = percentOnly.test(parts.channels[1]!) ? Number(parts.channels[1]!.slice(0, -1)) : null;
  const l = percentOnly.test(parts.channels[2]!) ? Number(parts.channels[2]!.slice(0, -1)) : null;
  if (s === null || l === null) return invalid();
  if (s < 0 || s > 100 || l < 0 || l > 100) return invalid("color.channelRange");
  return ok(hslToRgb({ h: Number(hueToken), s, l }, alpha));
}

/**
 * Parses HEX (3, 4, 6 or 8 digits, `#` optional) and `rgb()/rgba()/hsl()/hsla()` in both the comma and
 * the space syntax. Out-of-range values are rejected, not clamped, so a typo is never silently changed.
 */
export function parseColor(input: string): Result<Color> {
  const text = input.trim();
  if (text === "") return invalid("color.empty");
  const hex = HEX.exec(text);
  if (hex) return ok(parseHex(hex[1]!));
  const call = FUNCTION.exec(text);
  if (call) return parseFunction(call[1]!.toLowerCase(), call[2]!);
  return invalid();
}

import { DEFAULT_LOCALE, translate, type MessageKey, type MessageParams } from "../../../i18n";
import { fail, ok, type Result, type ToolError } from "../../../lib/result";
import { decode } from "../../../lib/text/base64";

const t = (key: MessageKey, params?: MessageParams): string =>
  translate(DEFAULT_LOCALE, key, params);

export type JwtPart = "header" | "payload";

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** Raw third segment, shown as-is. It is never verified. */
  signature: string;
  headerJson: string;
  payloadJson: string;
}

const failure = (key: MessageKey, params?: MessageParams, detail?: string) =>
  fail<ToolError>({ kind: "validation", message: t(key, params), detail });

function decodePart(segment: string, part: JwtPart): Result<Record<string, unknown>, ToolError> {
  const label = t(part === "header" ? "jwt.header" : "jwt.payload");
  const text = decode(segment, { urlSafe: true });
  if (!text.ok) return failure("jwt.invalidPart", { part: label }, text.error.message);

  let value: unknown;
  try {
    value = JSON.parse(text.value);
  } catch (error) {
    return failure(
      "jwt.notJson",
      { part: label },
      error instanceof Error ? error.message : undefined,
    );
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return failure("jwt.notObject", { part: label });
  }
  return ok(value as Record<string, unknown>);
}

/** Decode a compact JWT (three dot-separated parts). Decoding only: the signature is not checked. */
export function decodeJwt(token: string): Result<DecodedJwt, ToolError> {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return failure("jwt.invalidParts");

  const header = decodePart(parts[0]!, "header");
  if (!header.ok) return header;
  const payload = decodePart(parts[1]!, "payload");
  if (!payload.ok) return payload;

  return ok({
    header: header.value,
    payload: payload.value,
    signature: parts[2]!,
    headerJson: JSON.stringify(header.value, null, 2),
    payloadJson: JSON.stringify(payload.value, null, 2),
  });
}

export type TimeClaim = "iat" | "nbf" | "exp";

export interface ClaimTime {
  claim: TimeClaim;
  /** NumericDate: seconds since the Unix epoch. */
  seconds: number;
  date: Date;
}

export interface JwtTimes {
  claims: ClaimTime[];
  /** Claims present but not a usable number. */
  invalidClaims: TimeClaim[];
  /** Relative to the supplied clock; "none" when there is no usable exp. */
  expiry: "none" | "valid" | "expired";
  /** Seconds until exp (negative once expired). */
  expiresInSeconds?: number;
  notYetValid: boolean;
  /** Seconds until nbf when not yet valid. */
  validInSeconds?: number;
}

const TIME_CLAIMS: TimeClaim[] = ["iat", "nbf", "exp"];

/** The clock is a parameter so results are deterministic in tests. */
export function describeTimes(payload: Record<string, unknown>, nowSeconds: number): JwtTimes {
  const claims: ClaimTime[] = [];
  const invalidClaims: TimeClaim[] = [];

  for (const claim of TIME_CLAIMS) {
    if (!(claim in payload)) continue;
    const value = payload[claim];
    const date = typeof value === "number" ? new Date(value * 1000) : undefined;
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      date &&
      !Number.isNaN(date.getTime())
    ) {
      claims.push({ claim, seconds: value, date });
    } else {
      invalidClaims.push(claim);
    }
  }

  const exp = claims.find((c) => c.claim === "exp");
  const nbf = claims.find((c) => c.claim === "nbf");
  const notYetValid = nbf !== undefined && nowSeconds < nbf.seconds;

  return {
    claims,
    invalidClaims,
    // RFC 7519: the token must not be accepted on or after exp.
    expiry: exp ? (nowSeconds >= exp.seconds ? "expired" : "valid") : "none",
    expiresInSeconds: exp ? exp.seconds - nowSeconds : undefined,
    notYetValid,
    validInSeconds: notYetValid && nbf ? nbf.seconds - nowSeconds : undefined,
  };
}

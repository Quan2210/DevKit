import { describe, expect, it } from "vitest";
import {
  NOW_SECONDS,
  expiredToken,
  malformedTokens,
  noExpiryToken,
  notYetValidToken,
  sampleHeader,
  samplePayload,
  sampleToken,
  unicodeToken,
  unsecuredToken,
  validToken,
} from "../../../../tests/fixtures";
import * as jwt from "./jwt";
import { decodeJwt, describeTimes } from "./jwt";

describe("decodeJwt", () => {
  it("decodes the well-known sample token", () => {
    const result = decodeJwt(sampleToken);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.header).toEqual(sampleHeader);
      expect(result.value.payload).toEqual(samplePayload);
      expect(result.value.signature).toBe("SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
      expect(JSON.parse(result.value.payloadJson)).toEqual(samplePayload);
      expect(result.value.payloadJson).toContain('\n  "sub"'); // pretty-printed
    }
  });

  it("ignores surrounding whitespace and decodes Unicode claims", () => {
    const result = decodeJwt(`  ${unicodeToken}\n`);
    expect(result.ok && result.value.payload).toEqual({ name: "Nguyễn Văn A", note: "😀" });
  });

  it("accepts an unsecured token with an empty signature", () => {
    const result = decodeJwt(unsecuredToken);
    expect(result.ok && result.value.signature).toBe("");
  });

  it.each(malformedTokens)("rejects without throwing: $name", ({ token }) => {
    const result = decodeJwt(token);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it("names the failing part", () => {
    const result = decodeJwt(
      malformedTokens.find((t) => t.name.startsWith("payload is not JSON"))!.token,
    );
    expect(!result.ok && result.error.message).toContain("Payload");
  });

  it("never claims to verify a signature (AC: no verify capability)", () => {
    expect(Object.keys(jwt).some((name) => /verify|validate|trusted/i.test(name))).toBe(false);
  });
});

describe("describeTimes", () => {
  const payloadOf = (token: string) => {
    const decoded = decodeJwt(token);
    if (!decoded.ok) throw new Error("fixture must decode");
    return decoded.value.payload;
  };

  it("marks a token with a past exp as expired", () => {
    const times = describeTimes(payloadOf(expiredToken), NOW_SECONDS);
    expect(times.expiry).toBe("expired");
    expect(times.expiresInSeconds).toBe(-3600);
  });

  it("marks a token with a future exp as valid", () => {
    const times = describeTimes(payloadOf(validToken), NOW_SECONDS);
    expect(times.expiry).toBe("valid");
    expect(times.expiresInSeconds).toBe(3600);
    expect(times.notYetValid).toBe(false);
  });

  it("treats exp equal to now as expired (RFC 7519: not on or after exp)", () => {
    expect(describeTimes({ exp: NOW_SECONDS }, NOW_SECONDS).expiry).toBe("expired");
    expect(describeTimes({ exp: NOW_SECONDS + 1 }, NOW_SECONDS).expiry).toBe("valid");
  });

  it("reports a token without exp", () => {
    expect(describeTimes(payloadOf(noExpiryToken), NOW_SECONDS).expiry).toBe("none");
  });

  it("flags nbf in the future", () => {
    const times = describeTimes(payloadOf(notYetValidToken), NOW_SECONDS);
    expect(times.notYetValid).toBe(true);
    expect(times.validInSeconds).toBe(600);
  });

  it("returns real Dates for iat, nbf and exp in order", () => {
    const times = describeTimes({ exp: 1000, iat: 100, nbf: 500 }, 0);
    expect(times.claims.map((c) => c.claim)).toEqual(["iat", "nbf", "exp"]);
    expect(times.claims[0]!.date.toISOString()).toBe("1970-01-01T00:01:40.000Z");
  });

  it("separates claims that are present but not usable numbers", () => {
    const times = describeTimes({ exp: "tomorrow", iat: null, nbf: 1e20 }, NOW_SECONDS);
    expect(times.claims).toEqual([]);
    expect(times.invalidClaims).toEqual(["iat", "nbf", "exp"]);
    expect(times.expiry).toBe("none");
  });
});

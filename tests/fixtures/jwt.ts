/** JWT corpus for the JWT Decoder (PRD 3.2). Tokens are built with Node's independent base64url encoder. */
const part = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

export const makeJwt = (header: unknown, payload: unknown, signature = "c2ln"): string =>
  `${part(header)}.${part(payload)}.${signature}`;

/** Fixed clock for tests: 2024-01-01T00:00:00Z. */
export const NOW_SECONDS = 1_704_067_200;

/** The widely used jwt.io sample token (HS256, signature not verified by DevKit). */
export const sampleToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
export const sampleHeader = { alg: "HS256", typ: "JWT" };
export const samplePayload = { sub: "1234567890", name: "John Doe", iat: 1516239022 };

export const expiredToken = makeJwt(sampleHeader, {
  sub: "a",
  iat: NOW_SECONDS - 7200,
  exp: NOW_SECONDS - 3600,
});
export const validToken = makeJwt(sampleHeader, {
  sub: "a",
  iat: NOW_SECONDS - 60,
  exp: NOW_SECONDS + 3600,
});
export const notYetValidToken = makeJwt(sampleHeader, {
  sub: "a",
  nbf: NOW_SECONDS + 600,
  exp: NOW_SECONDS + 3600,
});
export const noExpiryToken = makeJwt(sampleHeader, { sub: "a" });
export const unicodeToken = makeJwt(sampleHeader, { name: "Nguyễn Văn A", note: "😀" });
export const unsecuredToken = `${part({ alg: "none", typ: "JWT" })}.${part({ sub: "a" })}.`;

export const malformedTokens: Array<{ name: string; token: string }> = [
  { name: "empty", token: "" },
  { name: "one part", token: "abc" },
  { name: "two parts", token: "abc.def" },
  { name: "four parts", token: "a.b.c.d" },
  { name: "invalid base64url characters", token: "eyJ!.eyJ!.sig" },
  {
    name: "header is not JSON",
    token: `${Buffer.from("not json").toString("base64url")}.${part({})}.sig`,
  },
  {
    name: "payload is not JSON",
    token: `${part({ alg: "HS256" })}.${Buffer.from("{oops").toString("base64url")}.sig`,
  },
  {
    name: "payload is a JSON string, not an object",
    token: `${part({ alg: "HS256" })}.${part("text")}.sig`,
  },
];

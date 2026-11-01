import { encode } from "../../lib/text/base64";

/**
 * Sample token for the "Mẫu" button. Built from readable JSON so it can be edited; the signature
 * is a placeholder because DevKit never verifies it. exp is far in the future so it reads as valid.
 */
const header = { alg: "HS256", typ: "JWT" };
const payload = {
  sub: "1234567890",
  name: "John Doe",
  iat: 1516239022,
  exp: 4102444800, // 2100-01-01T00:00:00Z
};

export const SAMPLE_TOKEN = `${encode(JSON.stringify(header), { urlSafe: true })}.${encode(JSON.stringify(payload), { urlSafe: true })}.c2lnbmF0dXJl`;

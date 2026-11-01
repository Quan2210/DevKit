import { decode, encode } from "../../../lib/text/base64";
import { ok, type Result, type ToolError } from "../../../lib/result";

export type Base64Mode = "encode" | "decode";

/** The Base64 tool's one entry point: text to Base64 or back, standard or URL-safe alphabet. */
export function convert(
  input: string,
  mode: Base64Mode,
  urlSafe: boolean,
): Result<string, ToolError> {
  if (input === "") return ok("");
  return mode === "encode" ? ok(encode(input, { urlSafe })) : decode(input, { urlSafe });
}

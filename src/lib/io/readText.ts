import { DEFAULT_LOCALE, translate } from "../../i18n";
import { fail, ok, type Result, type ToolError } from "../result";

const failure = (message: string) => fail<ToolError>({ kind: "validation", message });

/**
 * Read a user-chosen file as UTF-8 text. Rejects files over `maxBytes` before reading, and files that
 * are not valid UTF-8 or contain NUL bytes (binary), so the editor never fills with junk. A leading
 * BOM is dropped by the decoder.
 */
export async function readTextFile(
  file: File,
  maxBytes: number,
): Promise<Result<string, ToolError>> {
  if (file.size > maxBytes) {
    return failure(
      translate(DEFAULT_LOCALE, "file.tooLarge", { mb: Math.round(maxBytes / (1024 * 1024)) }),
    );
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    return text.includes("\u0000") ? failure(translate(DEFAULT_LOCALE, "file.notText")) : ok(text);
  } catch (error) {
    return failure(
      translate(DEFAULT_LOCALE, error instanceof TypeError ? "file.notText" : "file.readFailed"),
    );
  }
}

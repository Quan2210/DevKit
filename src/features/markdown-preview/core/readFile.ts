import { DEFAULT_LOCALE, translate, type MessageKey } from "../../../i18n";
import { fail, ok, type Result, type ToolError } from "../../../lib/result";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const failure = (key: MessageKey) =>
  fail<ToolError>({ kind: "validation", message: translate(DEFAULT_LOCALE, key) });

/** Cheap size check before reading the file at all. */
export function checkFileSize(size: number): Result<true, ToolError> {
  return size > MAX_FILE_BYTES ? failure("markdown.fileTooLarge") : ok(true);
}

/**
 * Decode a file read from disk. Must be valid UTF-8 text (a leading BOM is stripped) and not binary
 * (NUL bytes), otherwise the editor would fill with replacement characters.
 */
export function decodeMarkdownFile(buffer: ArrayBuffer): Result<string, ToolError> {
  const size = checkFileSize(buffer.byteLength);
  if (!size.ok) return size;
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return failure("markdown.fileNotText");
  }
  return text.includes("\u0000") ? failure("markdown.fileNotText") : ok(text);
}

export type ToolErrorKind = "validation" | "processing" | "unexpected";

export interface ToolError {
  kind: ToolErrorKind;
  message: string;
  /** 1-based position in the input, when the runtime reports one. */
  position?: { line: number; column: number };
}

export type Result<T, E = ToolError> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E = ToolError>(error: E): Result<never, E> => ({ ok: false, error });

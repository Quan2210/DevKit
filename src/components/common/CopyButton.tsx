import { Check, Copy } from "lucide-react";
import { useClipboard } from "../../hooks/useClipboard";
import { useT } from "../../i18n/useT";
import { Button, type ButtonProps } from "./Button";
import { IconButton } from "./IconButton";

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  /** Text to copy; a function is evaluated at click time (large outputs). */
  text: string | (() => string);
  /** Override the visible label, e.g. "Copy payload". */
  label?: string;
  onCopied?: (ok: boolean) => void;
  /** Icon with tooltip instead of a text label (compact headers). */
  iconOnly?: boolean;
}

/** The label changes in place ("Đã copy") instead of a toast; a live region announces the result. */
export function CopyButton({
  text,
  label,
  onCopied,
  iconOnly = false,
  variant = "ghost",
  ...rest
}: CopyButtonProps) {
  const t = useT();
  const { copy, state } = useClipboard();
  const idle = label ?? t("action.copy");
  const shown = state === "copied" ? t("action.copied") : idle;

  const doCopy = async () => {
    const copied = await copy(typeof text === "function" ? text() : text);
    onCopied?.(copied);
  };
  const icon =
    state === "copied" ? (
      <Check aria-hidden className="size-4" />
    ) : (
      <Copy aria-hidden className="size-4" />
    );
  const live = (
    <>
      <span role="status" className="sr-only">
        {state === "copied" ? t("action.copied") : state === "failed" ? t("action.copyFailed") : ""}
      </span>
      {state === "failed" ? (
        <span className="text-sm text-danger">{t("action.copyFailed")}</span>
      ) : null}
    </>
  );

  if (iconOnly) {
    return (
      <>
        <IconButton label={shown} icon={icon} onClick={doCopy} disabled={rest.disabled} />
        {live}
      </>
    );
  }

  return (
    <>
      <Button variant={variant} icon={icon} onClick={doCopy} {...rest}>
        <span className="inline-block min-w-[4.5rem] text-left">{shown}</span>
      </Button>
      {live}
    </>
  );
}

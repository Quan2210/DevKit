import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { IconButton } from "../../components/common/IconButton";
import { useT } from "../../i18n/useT";

export interface SearchBarProps {
  label: string;
  term: string;
  onTermChange: (term: string) => void;
  /** Number of matches and the 1-based one the search is on (0 when none). */
  count: number;
  current: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

/** Find bar for one pane. Enter goes to the next hit, Shift+Enter to the previous, Esc closes. */
export function SearchBar({
  label,
  term,
  onTermChange,
  count,
  current,
  onNext,
  onPrev,
  onClose,
}: SearchBarProps) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) onPrev();
      else onNext();
    }
  };

  return (
    <div role="search" className="flex items-center gap-1 border-b border-border px-2 py-1">
      <input
        ref={input}
        type="search"
        aria-label={label}
        placeholder={t("search.placeholder")}
        value={term}
        onChange={(event) => onTermChange(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        className="min-h-11 sm:min-h-9 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2 text-sm placeholder:text-text-muted"
      />
      <span
        role="status"
        className={`min-w-14 text-center text-sm tabular-nums ${count === 0 && term !== "" ? "text-warning-fg" : "text-text-muted"}`}
      >
        {term === ""
          ? ""
          : count === 0
            ? t("search.none")
            : t("search.count", { current, total: count })}
      </span>
      <IconButton
        label={t("search.prev")}
        icon={<ChevronUp aria-hidden className="size-4" />}
        disabled={count === 0}
        onClick={onPrev}
      />
      <IconButton
        label={t("search.next")}
        icon={<ChevronDown aria-hidden className="size-4" />}
        disabled={count === 0}
        onClick={onNext}
      />
      <IconButton
        label={t("search.close")}
        icon={<X aria-hidden className="size-4" />}
        onClick={onClose}
      />
    </div>
  );
}

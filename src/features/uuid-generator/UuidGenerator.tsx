import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/common/Button";
import { CopyButton } from "../../components/common/CopyButton";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { Input } from "../../components/common/Input";
import { Panel } from "../../components/common/Panel";
import { ToolShell } from "../../components/layout/ToolShell";
import { useHotkeys } from "../../hooks/useHotkeys";
import { getGuide } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import { useT } from "../../i18n/useT";
import { getTool } from "../../registry/tools.meta";
import { MAX_UUIDS, generateUuids } from "./core/uuid";

export function UuidGenerator() {
  const t = useT();
  const tool = getTool("uuid");
  const [count, setCount] = useState("5");
  const [uuids, setUuids] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = () => {
    const result = generateUuids(Number(count));
    if (result.ok) {
      setUuids(result.value);
      setError(null);
    } else {
      setError(result.error.message);
    }
  };

  useHotkeys([{ key: "Enter", mod: true, allowInInput: true, handler: generate }]);

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      toolbar={
        <>
          <div className="w-40">
            <Input
              label={t("uuid.count")}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_UUIDS}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              hint={t("uuid.countHint")}
            />
          </div>
          <Button
            variant="primary"
            icon={<RefreshCw aria-hidden className="size-4" />}
            onClick={generate}
          >
            {t("uuid.generate")}
          </Button>
          <CopyButton
            text={() => uuids.join("\n")}
            label={t("uuid.copyAll")}
            variant="secondary"
            disabled={uuids.length === 0}
          />
        </>
      }
      notice={error ? <ErrorBanner title={error} /> : null}
      status={
        <span className="tabular-nums">
          {uuids.length > 0
            ? t("uuid.total", { count: formatNumber(uuids.length) })
            : t("uuid.empty")}
        </span>
      }
    >
      <Panel title={t("uuid.list")} className="h-full">
        {uuids.length === 0 ? (
          <p className="p-4 text-text-muted">{t("uuid.empty")}</p>
        ) : (
          <ul
            aria-label={t("uuid.list")}
            className="max-h-[60dvh] divide-y divide-border overflow-y-auto"
          >
            {uuids.map((uuid, index) => (
              <li
                key={`${index}-${uuid}`}
                className="flex items-center justify-between gap-2 px-3 py-1"
              >
                <code className="break-all text-[13.5px] tabular-nums">{uuid}</code>
                <CopyButton text={uuid} aria-label={`${t("uuid.copyOne")} ${uuid}`} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ToolShell>
  );
}

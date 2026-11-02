import { Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../components/common/Button";
import { CopyButton } from "../../../components/common/CopyButton";
import { Input } from "../../../components/common/Input";
import { Panel } from "../../../components/common/Panel";
import { Segmented } from "../../../components/common/Segmented";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { ToolShell } from "../../../components/layout/ToolShell";
import { getGuide } from "../../../i18n";
import { useT } from "../../../i18n/useT";
import { getTool } from "../../../registry/tools.meta";
import {
  HARMONY_MODES,
  HARMONY_RANGE,
  clampCount,
  generateHarmony,
  hslToRgb,
  opaque,
  toCssVariables,
  toHex,
  type Color,
  type HarmonyMode,
} from "../shared/color-core";
import { ColorField } from "../shared/ColorField";
import { Swatch } from "../shared/Swatch";

const START: Color = opaque(79, 70, 229);

function randomBase(): Color {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  const [h, s] = values as unknown as [number, number];
  return hslToRgb({ h: h % 360, s: 50 + (s % 41), l: 50 });
}

export function ColorPalette() {
  const t = useT();
  const tool = getTool("color-palette");
  const [base, setBase] = useState<Color>(START);
  const [mode, setMode] = useState<HarmonyMode>("analogous");
  const [requested, setRequested] = useState(5);
  const [prefix, setPrefix] = useState("color");

  const range = HARMONY_RANGE[mode];
  const count = clampCount(mode, requested);
  const palette = useMemo(() => generateHarmony(base, mode, count), [base, mode, count]);
  const colors = palette.map((entry) => entry.color);
  const css = toCssVariables(colors, prefix);
  const all = colors.map(toHex).join("\n");

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      toolbar={
        <>
          <Segmented<HarmonyMode>
            label={t("palette.rule")}
            value={mode}
            onChange={setMode}
            options={HARMONY_MODES.map((value) => ({
              value,
              label: t(`palette.mode.${value}`),
            }))}
          />
          <Button
            icon={<Shuffle aria-hidden className="size-4" />}
            onClick={() => setBase(randomBase())}
          >
            {t("palette.random")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Panel title={t("palette.base")}>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <ColorField label={t("palette.base")} value={base} onChange={setBase} />
            <Input
              label={t("palette.count")}
              type="number"
              inputMode="numeric"
              min={range.min}
              max={range.max}
              step={1}
              value={requested}
              hint={t("palette.countHint", { min: range.min, max: range.max })}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) setRequested(next);
              }}
            />
          </div>
        </Panel>

        <Panel
          title={t("palette.swatches")}
          actions={<CopyButton text={all} label={t("palette.copyAll")} />}
        >
          <ul
            aria-label={t("palette.swatches")}
            className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5"
          >
            {palette.map((entry, index) => (
              <li key={`${index}-${toHex(entry.color)}`} className="min-w-0 space-y-2">
                <Swatch
                  color={entry.color}
                  className="h-20 w-full"
                  label={t("palette.swatchLabel", { index: index + 1, value: toHex(entry.color) })}
                />
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">{toHex(entry.color)}</p>
                    {entry.isBase ? (
                      <p className="text-xs text-text-muted">{t("palette.baseTag")}</p>
                    ) : null}
                  </div>
                  <CopyButton text={toHex(entry.color)} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t("palette.css")} actions={<CopyButton text={css} />}>
          <div className="space-y-3 p-3">
            <div className="max-w-xs">
              <Input
                label={t("palette.prefix")}
                value={prefix}
                spellCheck={false}
                onChange={(event) => setPrefix(event.target.value)}
              />
            </div>
            <div className="h-48">
              <CodeEditor language="css" readOnly value={css} ariaLabel={t("palette.cssLabel")} />
            </div>
          </div>
        </Panel>
      </div>
    </ToolShell>
  );
}

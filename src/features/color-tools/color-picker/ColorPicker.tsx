import { Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import { Button } from "../../../components/common/Button";
import { IconButton } from "../../../components/common/IconButton";
import { CopyButton } from "../../../components/common/CopyButton";
import { Input } from "../../../components/common/Input";
import { Notice } from "../../../components/common/Notice";
import { Panel } from "../../../components/common/Panel";
import { ToolShell } from "../../../components/layout/ToolShell";
import { useDebounced } from "../../../hooks/useDebounced";
import { useIsClient } from "../../../hooks/useIsClient";
import { getGuide } from "../../../i18n";
import { useT } from "../../../i18n/useT";
import { getTool } from "../../../registry/tools.meta";
import {
  hslToRgb,
  opaque,
  parseColor,
  toHex,
  toHslString,
  toRgbString,
  type Color,
} from "../shared/color-core";
import { Swatch } from "../shared/Swatch";
import { ImageColorPanel } from "./ImageColorPanel";
import { useRecentColors } from "../shared/useRecentColors";

const START: Color = opaque(79, 70, 229);

/** A random but pleasant color: any hue, mid saturation and lightness. */
function randomColor(): Color {
  const values = new Uint32Array(3);
  crypto.getRandomValues(values);
  const [h, s, l] = values as unknown as [number, number, number];
  return hslToRgb({ h: h % 360, s: 45 + (s % 46), l: 35 + (l % 36) });
}

interface ValueRowProps {
  label: string;
  value: string;
  onValid: (color: Color) => void;
}

/** One format as an editable field: valid text applies at once, invalid text shows an error. */
function ValueRow({ label, value, onValid }: ValueRowProps) {
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null);
  const parsed = draft !== null && draft.trim() !== "" ? parseColor(draft) : null;
  const error = parsed && !parsed.ok ? parsed.error.message : undefined;
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <Input
          label={label}
          value={draft ?? value}
          error={error}
          spellCheck={false}
          autoComplete="off"
          className="font-mono"
          onChange={(event) => {
            setDraft(event.target.value);
            const result = parseColor(event.target.value);
            if (result.ok) onValid(result.value);
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      <CopyButton text={value} disabled={error !== undefined} label={t("action.copy")} />
    </div>
  );
}

export function ColorPicker() {
  const t = useT();
  const tool = getTool("color-picker");
  const client = useIsClient();
  const [color, setColorState] = useState<Color>(START);
  // The starting color is not history; only colors the user picked are remembered.
  const touched = useRef(false);
  const setColor = (next: Color) => {
    touched.current = true;
    setColorState(next);
  };
  const recent = useRecentColors();

  // A color joins the history once it has stayed put for a moment, not on every drag step.
  const settled = useDebounced(color, 800);
  const { add } = recent;
  useEffect(() => {
    if (client && touched.current) add(settled);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `add` changes with the stored list; only a new color should add
  }, [settled, client]);

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      toolbar={
        <IconButton
          label={t("color.random")}
          icon={<Shuffle aria-hidden className="size-4" />}
          onClick={() => setColor(randomColor())}
        />
      }
      notice={
        client && !recent.persistent() ? (
          <Notice tone="warning">{t("color.storageOff")}</Notice>
        ) : null
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("color.pickerLabel")}>
          <div className="space-y-4 p-4">
            <div className="devkit-color-picker" role="group" aria-label={t("color.pickerLabel")}>
              <HexAlphaColorPicker
                color={toHex(color).toLowerCase()}
                onChange={(hex) => {
                  const result = parseColor(hex);
                  if (result.ok) setColor(result.value);
                }}
                style={{ width: "100%" }}
              />
            </div>
            <Swatch color={color} className="h-20 w-full" label={t("color.preview")} />
          </div>
        </Panel>

        <Panel title={t("color.values")}>
          <div className="space-y-4 p-4">
            <ValueRow label={t("color.hex")} value={toHex(color)} onValid={setColor} />
            <ValueRow label={t("color.rgb")} value={toRgbString(color)} onValid={setColor} />
            <ValueRow label={t("color.hsl")} value={toHslString(color)} onValid={setColor} />
          </div>
        </Panel>

        <ImageColorPanel onPick={setColor} />

        <Panel
          title={t("color.recent")}
          className="lg:col-span-2"
          actions={
            <Button variant="ghost" onClick={recent.clear} disabled={recent.colors.length === 0}>
              {t("color.recentClear")}
            </Button>
          }
        >
          <div className="p-4">
            {!client || recent.colors.length === 0 ? (
              <p className="text-sm text-text-muted">{t("color.recentEmpty")}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {recent.colors.map((entry) => (
                  <li key={toHex(entry)}>
                    <button
                      type="button"
                      onClick={() => setColor(entry)}
                      aria-label={t("color.recentUse", { color: toHex(entry) })}
                      title={toHex(entry)}
                      className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <Swatch color={entry} className="size-10 sm:size-9" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </ToolShell>
  );
}

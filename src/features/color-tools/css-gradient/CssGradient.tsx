import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "../../../components/common/Button";
import { CopyButton } from "../../../components/common/CopyButton";
import { IconButton } from "../../../components/common/IconButton";
import { Notice } from "../../../components/common/Notice";
import { Panel } from "../../../components/common/Panel";
import { Segmented } from "../../../components/common/Segmented";
import { ToolShell } from "../../../components/layout/ToolShell";
import { getGuide } from "../../../i18n";
import { useT } from "../../../i18n/useT";
import { getTool } from "../../../registry/tools.meta";
import {
  RADIAL_POSITIONS,
  clamp,
  gradientToCss,
  sortedStops,
  opaque,
  parseColor,
  type Color,
  type Gradient,
  type GradientStop,
  type RadialPosition,
} from "../shared/color-core";
import { ColorField } from "../shared/ColorField";
import { NumberField } from "../shared/NumberField";
import { PRESETS } from "./presets";

const MIN_STOPS = 2;
const MAX_STOPS = 10;

type Kind = "linear" | "radial";

let counter = 0;
const nextId = () => `stop-${(counter += 1)}`;
const stop = (color: Color, position: number): GradientStop => ({ id: nextId(), color, position });

const hex = (value: string): Color => {
  const parsed = parseColor(value);
  return parsed.ok ? parsed.value : opaque(0, 0, 0);
};

export function CssGradient() {
  const t = useT();
  const tool = getTool("css-gradient");
  const select = useId();
  const [kind, setKind] = useState<Kind>("linear");
  const [angle, setAngle] = useState(135);
  const [shape, setShape] = useState<"circle" | "ellipse">("circle");
  const [position, setPosition] = useState<RadialPosition>("center");
  const [stops, setStops] = useState<GradientStop[]>(() => [
    stop(hex("#4F46E5"), 0),
    stop(hex("#EC4899"), 100),
  ]);

  const gradient: Gradient = useMemo(
    () =>
      kind === "linear"
        ? { type: "linear", angle, stops }
        : { type: "radial", shape, position, stops },
    [kind, angle, shape, position, stops],
  );
  const css = useMemo(() => gradientToCss(gradient), [gradient]);

  const update = (id: string, patch: Partial<GradientStop>) =>
    setStops((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const move = (index: number, delta: -1 | 1) =>
    setStops((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      // Swapping rows also swaps their positions so the visible order and the gradient stay in step.
      const next = [...list];
      const a = next[index]!;
      const b = next[target]!;
      next[index] = { ...b, position: a.position };
      next[target] = { ...a, position: b.position };
      return next;
    });
  // The list is kept in position order (what the gradient shows); typing a position re-sorts on blur.
  const resort = () => setStops((list) => sortedStops(list));
  const add = () =>
    setStops((list) => {
      if (list.length >= MAX_STOPS) return list;
      const sorted = sortedStops(list);
      const last = sorted.at(-1)!;
      const before = sorted.at(-2) ?? last;
      return sortedStops([
        ...sorted,
        stop(last.color, Math.round((last.position + before.position) / 2)),
      ]);
    });

  return (
    <ToolShell tool={tool} guide={getGuide("vi", tool.id)}>
      <div className="space-y-4">
        <div
          role="img"
          aria-label={t("gradient.previewLabel")}
          className="h-40 w-full rounded-lg border border-border-strong max-sm:sticky max-sm:top-2 max-sm:z-10 sm:h-64"
          style={{ backgroundImage: css }}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={t("gradient.type")}>
            <div className="space-y-4 p-4">
              <Segmented<Kind>
                label={t("gradient.type")}
                value={kind}
                onChange={setKind}
                options={[
                  { value: "linear", label: t("gradient.linear") },
                  { value: "radial", label: t("gradient.radial") },
                ]}
              />
              {kind === "linear" ? (
                <div className="space-y-2">
                  <NumberField
                    label={t("gradient.angle")}
                    min={0}
                    max={360}
                    value={angle}
                    onCommit={(next) => setAngle(clamp(next, 0, 360))}
                  />
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={angle}
                    aria-label={t("gradient.angleSlider")}
                    onChange={(event) => setAngle(Number(event.target.value))}
                    className="h-10 w-full accent-primary sm:h-5"
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Segmented<"circle" | "ellipse">
                    label={t("gradient.shape")}
                    value={shape}
                    onChange={setShape}
                    options={[
                      { value: "circle", label: t("gradient.circle") },
                      { value: "ellipse", label: t("gradient.ellipse") },
                    ]}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={select} className="text-sm font-medium">
                      {t("gradient.position")}
                    </label>
                    <select
                      id={select}
                      value={position}
                      onChange={(event) => setPosition(event.target.value as RadialPosition)}
                      className="min-h-10 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm sm:min-h-9"
                    >
                      {RADIAL_POSITIONS.map((value) => (
                        <option key={value} value={value}>
                          {t(`gradient.pos.${value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("gradient.presets")}</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      onClick={() => {
                        setStops(
                          preset.colors.map((value, i) =>
                            stop(hex(value), Math.round((i / (preset.colors.length - 1)) * 100)),
                          ),
                        );
                        setAngle(preset.angle);
                      }}
                    >
                      {t(`gradient.preset.${preset.id}`)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title={t("gradient.stops")}
            actions={
              <Button
                variant="ghost"
                icon={<Plus aria-hidden className="size-4" />}
                onClick={add}
                disabled={stops.length >= MAX_STOPS}
              >
                {t("gradient.addStop")}
              </Button>
            }
          >
            <ol className="space-y-3 p-4" aria-label={t("gradient.order")}>
              {stops.map((item, index) => {
                const n = index + 1;
                return (
                  <li key={item.id} className="flex flex-wrap items-end gap-2">
                    <ColorField
                      className="min-w-48 flex-1"
                      label={t("gradient.stopColor", { n })}
                      value={item.color}
                      onChange={(color) => update(item.id, { color })}
                    />
                    <div className="w-24">
                      <NumberField
                        label={t("gradient.stopPosition", { n })}
                        min={0}
                        max={100}
                        value={item.position}
                        onCommit={(next) => update(item.id, { position: clamp(next, 0, 100) })}
                        onBlur={resort}
                      />
                    </div>
                    <div className="flex">
                      <IconButton
                        label={t("gradient.moveUp", { n })}
                        icon={<ArrowUp aria-hidden className="size-4" />}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      />
                      <IconButton
                        label={t("gradient.moveDown", { n })}
                        icon={<ArrowDown aria-hidden className="size-4" />}
                        disabled={index === stops.length - 1}
                        onClick={() => move(index, 1)}
                      />
                      <IconButton
                        label={t("gradient.remove", { n })}
                        icon={<Trash2 aria-hidden className="size-4" />}
                        disabled={stops.length <= MIN_STOPS}
                        onClick={() =>
                          setStops((list) => list.filter((entry) => entry.id !== item.id))
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
            {stops.length <= MIN_STOPS ? (
              <div className="px-4 pb-4">
                <Notice tone="info">{t("gradient.minStops")}</Notice>
              </div>
            ) : null}
          </Panel>
        </div>

        <Panel
          title={t("gradient.css")}
          actions={<CopyButton text={`background: ${css};`} label={t("gradient.copyCss")} />}
        >
          <pre
            aria-label={t("gradient.cssLabel")}
            className="overflow-x-auto p-4 font-mono text-sm whitespace-pre-wrap break-all"
          >
            {`background: ${css};`}
          </pre>
        </Panel>
      </div>
    </ToolShell>
  );
}

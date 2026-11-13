import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../components/common/Button";
import { CopyButton } from "../../../components/common/CopyButton";
import { Notice } from "../../../components/common/Notice";
import { Panel } from "../../../components/common/Panel";
import { Segmented } from "../../../components/common/Segmented";
import { ToolShell } from "../../../components/layout/ToolShell";
import { getGuide } from "../../../i18n";
import { useT } from "../../../i18n/useT";
import { cn } from "../../../lib/cn";
import { getTool } from "../../../registry/tools.meta";
import {
  THRESHOLDS,
  checkContrast,
  contrastRatio,
  formatRatio,
  opaque,
  suggestForeground,
  toHex,
  toRgbString,
  type Color,
} from "../shared/color-core";
import { ColorField } from "../shared/ColorField";
import { Swatch } from "../shared/Swatch";

type Assumed = "white" | "black" | "custom";
type Target = "aa" | "aaa";

function Verdict({ pass }: { pass: boolean }) {
  const t = useT();
  const Icon = pass ? Check : X;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        pass ? "text-success-fg" : "text-danger",
      )}
    >
      <Icon aria-hidden className="size-4" />
      {pass ? t("contrast.pass") : t("contrast.fail")}
    </span>
  );
}

export function ColorContrast() {
  const t = useT();
  const tool = getTool("color-contrast");
  const [foreground, setForeground] = useState<Color>(opaque(15, 23, 42));
  const [background, setBackground] = useState<Color>(opaque(248, 250, 252));
  const [assumed, setAssumed] = useState<Assumed>("white");
  const [custom, setCustom] = useState<Color>(opaque(128, 128, 128));
  const [target, setTarget] = useState<Target>("aa");

  const assumedColor =
    assumed === "white" ? opaque(255, 255, 255) : assumed === "black" ? opaque(0, 0, 0) : custom;
  const result = useMemo(
    () => checkContrast(foreground, background, assumedColor),
    [foreground, background, assumedColor],
  );
  const goal = target === "aa" ? THRESHOLDS.aaNormal : THRESHOLDS.aaaNormal;
  const suggestion = useMemo(
    () => suggestForeground(result.foreground, result.background, goal),
    [result.foreground, result.background, goal],
  );
  const alreadyPasses = result.ratio >= goal;

  const swap = () => {
    setForeground(background);
    setBackground(foreground);
  };

  return (
    <ToolShell
      status={
        <span className="tabular-nums">{t("contrast.ratioValue", { ratio: result.display })}</span>
      }
      tool={tool}
      guide={getGuide("vi", tool.id)}
      toolbar={<Button onClick={swap}>{t("contrast.swap")}</Button>}
      notice={
        result.hasAlpha ? (
          <Notice tone="info">
            {background.a < 1
              ? t("contrast.alphaNote", { assumed: toHex(assumedColor) })
              : t("contrast.alphaNoteText")}{" "}
            {t("contrast.effective", {
              fg: toHex(result.foreground),
              bg: toHex(result.background),
            })}
          </Notice>
        ) : null
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("contrast.previewLabel")}>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField label={t("contrast.fg")} value={foreground} onChange={setForeground} />
              <ColorField label={t("contrast.bg")} value={background} onChange={setBackground} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={toHex(foreground)} label={t("contrast.copyFg")} />
              <CopyButton text={toHex(background)} label={t("contrast.copyBg")} />
            </div>
            <div className="space-y-2">
              <Segmented<Assumed>
                label={t("contrast.assumed")}
                value={assumed}
                onChange={setAssumed}
                options={[
                  { value: "white", label: t("contrast.assumedWhite") },
                  { value: "black", label: t("contrast.assumedBlack") },
                  { value: "custom", label: t("contrast.assumedCustom") },
                ]}
              />
              {assumed === "custom" ? (
                <ColorField
                  label={t("contrast.assumedColor")}
                  value={custom}
                  onChange={(next) => setCustom(opaque(next.r, next.g, next.b))}
                />
              ) : null}
            </div>
            <div
              role="img"
              aria-label={t("contrast.previewLabel")}
              className="rounded-md border border-border-strong p-4"
              style={{
                backgroundColor: toRgbString(result.background),
                color: toRgbString(result.foreground),
              }}
            >
              <p className="text-base">{t("contrast.sampleNormal")}</p>
              <p className="text-2xl font-semibold">{t("contrast.sampleLarge")}</p>
            </div>
          </div>
        </Panel>

        <Panel title={t("contrast.resultTitle")}>
          <div className="space-y-4 p-4">
            <div>
              <p className="text-sm text-text-muted">{t("contrast.ratio")}</p>
              <p className="text-3xl font-semibold tabular-nums" data-testid="ratio">
                {t("contrast.ratioValue", { ratio: result.display })}
              </p>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-text-muted">
                  <th scope="col" className="py-2 pr-2 font-medium">
                    {t("contrast.level")}
                  </th>
                  <th scope="col" className="py-2 pr-2 font-medium">
                    {t("contrast.normalText")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("contrast.largeText")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(["aa", "aaa"] as const).map((level) => (
                  <tr key={level} className="border-t border-border">
                    <th scope="row" className="py-2 pr-2 text-left font-medium uppercase">
                      {level}
                      <span className="ml-1 font-normal text-text-muted tabular-nums">
                        {`(${formatRatio(THRESHOLDS[`${level}Normal`])} / ${formatRatio(THRESHOLDS[`${level}Large`])})`}
                      </span>
                    </th>
                    {(["Normal", "Large"] as const).map((size) => (
                      <td key={size} className="py-2 pr-2">
                        <Verdict pass={result.passes[`${level}${size}`]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">{t("contrast.suggestTitle")}</h3>
              <Segmented<Target>
                label={t("contrast.suggestTarget")}
                value={target}
                onChange={setTarget}
                options={[
                  { value: "aa", label: "AA" },
                  { value: "aaa", label: "AAA" },
                ]}
              />
              {alreadyPasses ? (
                <p className="text-sm text-text-muted">{t("contrast.suggestOk")}</p>
              ) : suggestion ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Swatch color={suggestion} className="size-10" />
                  <span className="font-mono text-sm">
                    {t("contrast.suggestResult", {
                      color: toHex(suggestion),
                      ratio: formatRatio(contrastRatio(suggestion, result.background)),
                    })}
                  </span>
                  <Button onClick={() => setForeground({ ...suggestion, a: 1 })}>
                    {t("contrast.suggestUse")}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-text-muted">{t("contrast.suggestNone")}</p>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </ToolShell>
  );
}

import { Palette, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useAppearance } from "../../hooks/useAppearance";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useT } from "../../i18n/useT";
import type { MessageKey } from "../../i18n/locales/vi";
import {
  PRESETS,
  normalizeHex,
  resolveAppearance,
  type Appearance,
  type NavStyle,
  type RegionId,
} from "../../lib/appearance";
import { cn } from "../../lib/cn";
import { storage } from "../../lib/storage";
import { Button } from "../common/Button";
import { Checkbox } from "../common/Checkbox";
import { Dialog } from "../common/Dialog";
import { Popover } from "../common/Popover";
import { Segmented } from "../common/Segmented";
import { StatusBadge } from "../common/StatusBadge";

const REGIONS: ReadonlyArray<{ id: RegionId; label: MessageKey }> = [
  { id: "page", label: "appearance.regionPage" },
  { id: "nav", label: "appearance.regionNav" },
  { id: "panel", label: "appearance.regionPanel" },
  { id: "status", label: "appearance.regionStatus" },
];

const PRESET_LABEL: Record<string, MessageKey> = {
  teal: "appearance.teal",
  blue: "appearance.blue",
  violet: "appearance.violet",
  pink: "appearance.pink",
  orange: "appearance.orange",
  green: "appearance.green",
  slate: "appearance.slate",
};

/** One choice of base colour: a radio with a swatch and its name (colour is never the only cue). */
function BaseOption({
  checked,
  onSelect,
  swatch,
  label,
}: {
  checked: boolean;
  onSelect: () => void;
  swatch: string | null;
  label: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 sm:min-h-9 cursor-pointer items-center gap-2 rounded-md border px-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
        checked
          ? "border-primary bg-surface-muted font-medium"
          : "border-border hover:bg-surface-muted",
      )}
    >
      <input
        type="radio"
        name="appearance-base"
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden
        className="size-4 shrink-0 rounded-full border border-border-strong"
        style={swatch ? { backgroundColor: swatch } : undefined}
      />
      {label}
    </label>
  );
}

/** The panel: choose a base colour and where it applies. Every change is saved and applied at once. */
function AppearancePanel() {
  const t = useT();
  const [appearance, setAppearance, reset] = useAppearance();
  const [draft, setDraft] = useState<string | null>(null);
  const [blurred, setBlurred] = useState(false);
  const custom = appearance.base !== null;
  const resolved = custom ? resolveAppearance(appearance) : null;

  const change = (patch: Partial<Appearance>) => setAppearance({ ...appearance, ...patch });
  const pick = (hex: string | null) => {
    setDraft(null);
    setBlurred(false);
    if (hex === null) reset();
    else change({ base: hex });
  };

  const shown = draft ?? appearance.base ?? "";
  const invalid = draft !== null && draft.trim() !== "" && normalizeHex(draft) === null && blurred;
  const statusKey: MessageKey | null = resolved
    ? resolved.status === "ok"
      ? "appearance.ok"
      : resolved.status === "adjusted"
        ? "appearance.adjusted"
        : "appearance.rejected"
    : null;

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">{t("appearance.base")}</legend>
        <div className="grid grid-cols-2 gap-1.5">
          <BaseOption
            checked={!custom}
            onSelect={() => pick(null)}
            swatch={null}
            label={t("appearance.default")}
          />
          {PRESETS.map((preset) => (
            <BaseOption
              key={preset.id}
              checked={appearance.base === preset.hex}
              onSelect={() => pick(preset.hex)}
              swatch={preset.hex}
              label={t(PRESET_LABEL[preset.id]!)}
            />
          ))}
        </div>
        <div className="flex items-end gap-2 pt-1">
          <input
            type="color"
            aria-label={t("appearance.picker")}
            title={t("appearance.picker")}
            value={appearance.base ?? PRESETS[0]!.hex}
            onChange={(event) => pick(event.target.value)}
            className="size-11 shrink-0 cursor-pointer rounded-md border border-border-strong bg-surface p-1"
          />
          <div className="min-w-0 flex-1">
            <label htmlFor="appearance-hex" className="mb-1 block text-xs font-medium">
              {t("appearance.hex")}
            </label>
            <input
              id="appearance-hex"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={7}
              value={shown}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "appearance-hex-error" : undefined}
              onChange={(event) => {
                setDraft(event.target.value);
                setBlurred(false);
                if (/^#?[0-9a-f]{6}$/i.test(event.target.value.trim())) {
                  change({ base: normalizeHex(event.target.value)! });
                }
              }}
              onBlur={() => {
                const hex = draft === null ? null : normalizeHex(draft);
                if (hex) pick(hex);
                else setBlurred(true);
              }}
              className={cn(
                "min-h-11 sm:min-h-9 w-full rounded-md border bg-surface px-2 font-mono text-sm",
                invalid ? "border-danger" : "border-border-strong",
              )}
            />
          </div>
        </div>
        {invalid ? (
          <p id="appearance-hex-error" role="alert" className="text-sm text-danger">
            {t("appearance.hexInvalid")}
          </p>
        ) : null}
      </fieldset>

      {custom ? null : <p className="text-sm text-text-muted">{t("appearance.pickToEnable")}</p>}

      <fieldset disabled={!custom} className="space-y-3 disabled:opacity-60">
        <div>
          <legend className="mb-1 text-sm font-semibold">{t("appearance.apply")}</legend>
          <div className="grid grid-cols-2 gap-x-2">
            {REGIONS.map((region) => (
              <Checkbox
                key={region.id}
                label={t(region.label)}
                checked={appearance.regions[region.id]}
                onChange={(event) =>
                  change({
                    regions: { ...appearance.regions, [region.id]: event.target.checked },
                  })
                }
              />
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold">{t("appearance.navStyle")}</div>
          <Segmented<NavStyle>
            label={t("appearance.navStyle")}
            value={appearance.navStyle}
            onChange={(navStyle) => change({ navStyle })}
            options={[
              { value: "tint", label: t("appearance.navTint") },
              { value: "solid", label: t("appearance.navSolid") },
            ]}
          />
        </div>
      </fieldset>

      <div role="status" className="min-h-7">
        {resolved && statusKey ? (
          <StatusBadge
            tone={
              resolved.status === "ok"
                ? "success"
                : resolved.status === "adjusted"
                  ? "info"
                  : "warning"
            }
          >
            {t(statusKey)}
          </StatusBadge>
        ) : null}
      </div>
      {custom && !storage.persistent ? (
        <p className="text-sm text-text-muted">{t("appearance.notSaved")}</p>
      ) : null}

      <Button
        icon={<RotateCcw aria-hidden className="size-4" />}
        onClick={() => pick(null)}
        disabled={!custom}
      >
        {t("appearance.reset")}
      </Button>
    </div>
  );
}

/**
 * Top-nav button for the frame colours: a popover from sm, a dialog below it.
 * A dot in the chosen colour shows that a custom colour is on.
 */
export function AppearanceMenu() {
  const t = useT();
  const wide = useMediaQuery("(min-width: 640px)");
  const [open, setOpen] = useState(false);
  const [appearance] = useAppearance();
  const icon = (
    <span className="relative inline-flex">
      <Palette aria-hidden className="size-4" />
      {appearance.base ? (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 size-2 rounded-full border border-surface"
          style={{ backgroundColor: appearance.base }}
        />
      ) : null}
    </span>
  );
  const buttonClass =
    "inline-flex size-11 items-center justify-center rounded-md text-text hover:bg-surface-muted sm:size-9";

  if (wide) {
    return (
      <Popover
        label={t("appearance.title")}
        title={t("appearance.button")}
        placement="below"
        triggerClassName={buttonClass}
        trigger={icon}
      >
        <AppearancePanel />
      </Popover>
    );
  }
  return (
    <>
      <button
        type="button"
        title={t("appearance.button")}
        aria-label={t("appearance.button")}
        aria-haspopup="dialog"
        className={buttonClass}
        onClick={() => setOpen(true)}
      >
        {icon}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("appearance.title")}>
        <AppearancePanel />
      </Dialog>
    </>
  );
}

import { useCallback, useMemo } from "react";
import { useStoredValue } from "../../../hooks/useStoredValue";
import { STORAGE_KEYS, storage } from "../../../lib/storage";
import { parseColor, toHex8, type Color } from "./color-core";

export const MAX_RECENT = 20;

const HEX8 = /^#[0-9A-F]{8}$/;

/** Stored as one comma-separated string of #RRGGBBAA values; anything else is ignored. */
const parseRecent = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") return undefined;
  const items = raw.split(",").filter((item) => HEX8.test(item));
  return [...new Set(items)].slice(0, MAX_RECENT).join(",");
};

/** Newest first, no duplicates, at most 20 (PRD 3.6). Works without localStorage (memory only). */
export function useRecentColors() {
  const [raw, setRaw, removeRaw] = useStoredValue(STORAGE_KEYS.recentColors, parseRecent, "");
  const colors = useMemo(
    () =>
      raw === ""
        ? []
        : raw.split(",").flatMap((hex) => {
            const parsed = parseColor(hex);
            return parsed.ok ? [parsed.value] : [];
          }),
    [raw],
  );

  const add = useCallback(
    (color: Color) => {
      const hex = toHex8(color);
      const rest = raw === "" ? [] : raw.split(",").filter((item) => item !== hex);
      setRaw([hex, ...rest].slice(0, MAX_RECENT).join(","));
    },
    [raw, setRaw],
  );

  return {
    colors,
    add,
    clear: removeRaw,
    /** False when the browser refused storage, so history only lasts until reload. */
    persistent: () => storage.persistent,
  };
}

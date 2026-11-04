import { ImagePlus, Pipette, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { IconButton } from "../../../components/common/IconButton";
import { Panel } from "../../../components/common/Panel";
import { useIsClient } from "../../../hooks/useIsClient";
import { useT } from "../../../i18n/useT";
import { opaque, toHex, type Color } from "../shared/color-core";
import { Swatch } from "../shared/Swatch";

/** Pictures are read in the browser only; anything beyond this is refused, not downscaled silently. */
const MAX_BYTES = 25 * 1024 * 1024;
/** Larger pictures are drawn smaller so the canvas stays within browser limits. */
const MAX_SIDE = 4096;
/** The loupe shows (2 * RADIUS + 1) pixels per side. */
const RADIUS = 5;
const LOUPE_SIZE = 110;

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>;
}
type EyeDropperCtor = new () => EyeDropperLike;

export interface ImageColorPanelProps {
  /** Called with each color picked from the image or the screen. */
  onPick: (color: Color) => void;
}

/** Pick a color by clicking a point on a picture (file, drop or paste) or anywhere on screen. */
export function ImageColorPanel({ onPick }: ImageColorPanelProps) {
  const t = useT();
  const client = useIsClient();
  const canvas = useRef<HTMLCanvasElement>(null);
  const loupe = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<{ bitmap: ImageBitmap; w: number; h: number } | null>(null);
  const size = source ? { w: source.w, h: source.h } : null;
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [picked, setPicked] = useState<Color | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const EyeDropper =
    client && typeof window !== "undefined"
      ? (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
      : undefined;

  const load = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError(t("color.imageError"));
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(t("color.imageTooBig"));
        return;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        setSource({ bitmap, w, h });
        setPoint(null);
        setPicked(null);
        setError(null);
      } catch {
        setError(t("color.imageError"));
      }
    },
    [t],
  );

  // Draw once the canvas for this picture is in the DOM.
  useEffect(() => {
    if (!source) return;
    const context = canvas.current?.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.clearRect(0, 0, source.w, source.h);
    context.drawImage(source.bitmap, 0, 0, source.w, source.h);
  }, [source]);

  // Ctrl+V anywhere on the page: the first image on the clipboard becomes the picture.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void load(file);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [load]);

  const pixelAt = (x: number, y: number): Color | null => {
    const context = canvas.current?.getContext("2d", { willReadFrequently: true });
    if (!context || !size) return null;
    const [r, g, b] = context.getImageData(x, y, 1, 1).data;
    return opaque(r ?? 0, g ?? 0, b ?? 0);
  };

  const drawLoupe = (x: number, y: number) => {
    const source = canvas.current;
    const target = loupe.current?.getContext("2d");
    if (!source || !target || !size) return;
    const span = RADIUS * 2 + 1;
    target.imageSmoothingEnabled = false;
    target.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    target.drawImage(source, x - RADIUS, y - RADIUS, span, span, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
    const cell = LOUPE_SIZE / span;
    target.lineWidth = 2;
    target.strokeStyle = "#ffffff";
    target.strokeRect(RADIUS * cell, RADIUS * cell, cell, cell);
    target.lineWidth = 1;
    target.strokeStyle = "#000000";
    target.strokeRect(RADIUS * cell + 1.5, RADIUS * cell + 1.5, cell - 3, cell - 3);
  };

  const pickAt = (x: number, y: number) => {
    if (!size) return;
    const cx = Math.min(Math.max(Math.round(x), 0), size.w - 1);
    const cy = Math.min(Math.max(Math.round(y), 0), size.h - 1);
    const color = pixelAt(cx, cy);
    if (!color) return;
    setPoint({ x: cx, y: cy });
    setPicked(color);
    drawLoupe(cx, cy);
    onPick(color);
  };

  const coords = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!size || rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * size.w - 0.5,
      y: ((event.clientY - rect.top) / rect.height) * size.h - 0.5,
    };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const at = coords(event);
    if (at) pickAt(at.x, at.y);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const at = coords(event);
    if (!at || !size) return;
    if (event.buttons & 1) pickAt(at.x, at.y);
    else
      drawLoupe(
        Math.min(Math.max(Math.round(at.x), 0), size.w - 1),
        Math.min(Math.max(Math.round(at.y), 0), size.h - 1),
      );
  };
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move || !size) return;
    event.preventDefault();
    const from = point ?? { x: Math.floor(size.w / 2), y: Math.floor(size.h / 2) };
    pickAt(from.x + move[0], from.y + move[1]);
  };

  const pickFromScreen = async () => {
    if (!EyeDropper) return;
    try {
      const { sRGBHex } = await new EyeDropper().open();
      const r = parseInt(sRGBHex.slice(1, 3), 16);
      const g = parseInt(sRGBHex.slice(3, 5), 16);
      const b = parseInt(sRGBHex.slice(5, 7), 16);
      const color = opaque(r, g, b);
      setPicked(color);
      onPick(color);
    } catch {
      // Cancelled with Esc: nothing to do.
    }
  };

  return (
    <Panel
      title={t("color.image")}
      className="lg:col-span-2"
      actions={
        <>
          {EyeDropper ? (
            <IconButton
              label={t("color.eyedropper")}
              icon={<Pipette aria-hidden className="size-4" />}
              onClick={() => void pickFromScreen()}
            />
          ) : null}
          <IconButton
            label={t("color.imageChoose")}
            icon={<ImagePlus aria-hidden className="size-4" />}
            onClick={() => fileInput.current?.click()}
          />
          {size ? (
            <IconButton
              label={t("color.imageClear")}
              icon={<X aria-hidden className="size-4" />}
              onClick={() => {
                setSource(null);
                setPoint(null);
                setPicked(null);
              }}
            />
          ) : null}
        </>
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={t("color.imageChoose")}
        tabIndex={-1}
        onChange={(event) => {
          void load(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void load(event.dataTransfer.files[0]);
        }}
        className={
          "flex min-h-48 flex-col items-center justify-center gap-3 p-3 sm:flex-row sm:items-start " +
          (dragging ? "bg-surface-muted" : "")
        }
      >
        {size ? (
          <>
            <div className="relative inline-block max-w-full leading-none">
              <canvas
                ref={canvas}
                width={size.w}
                height={size.h}
                tabIndex={0}
                aria-label={t("color.imageCanvas")}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onKeyDown={onKeyDown}
                className="block cursor-crosshair touch-none rounded-md border border-border-strong"
                style={{ maxWidth: "100%", maxHeight: "60dvh", width: "auto", height: "auto" }}
              />
              {point ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_#000]"
                  style={{
                    left: `${((point.x + 0.5) / size.w) * 100}%`,
                    top: `${((point.y + 0.5) / size.h) * 100}%`,
                  }}
                />
              ) : null}
            </div>
            <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-stretch">
              <canvas
                ref={loupe}
                width={LOUPE_SIZE}
                height={LOUPE_SIZE}
                aria-label={t("color.loupe")}
                role="img"
                className="rounded-md border border-border-strong"
                style={{ width: LOUPE_SIZE, height: LOUPE_SIZE, imageRendering: "pixelated" }}
              />
              {picked ? (
                <div className="flex items-center gap-2">
                  <Swatch color={picked} className="size-8" />
                  <output className="font-mono text-sm">{toHex(picked)}</output>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-sm text-text-muted hover:bg-surface-muted"
          >
            <ImagePlus aria-hidden className="size-6" />
            {t("color.imageEmpty")}
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="px-3 pb-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}

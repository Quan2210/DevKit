import { clamp, type Color, type Hsl } from "./types";

export function rgbToHsl({ r, g, b }: Color): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l: l * 100 };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === red) h = ((green - blue) / delta) % 6;
  else if (max === green) h = (blue - red) / delta + 2;
  else h = (red - green) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl, a = 1): Color {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - chroma / 2;
  const sector = Math.floor(hue / 60);
  const [r1, g1, b1] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][sector % 6]!;
  return { r: (r1! + m) * 255, g: (g1! + m) * 255, b: (b1! + m) * 255, a };
}

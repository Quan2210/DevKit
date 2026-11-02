export interface GradientPreset {
  id: "sunset" | "ocean" | "forest" | "aurora" | "mono";
  angle: number;
  colors: string[];
}

export const PRESETS: ReadonlyArray<GradientPreset> = [
  { id: "sunset", angle: 135, colors: ["#F97316", "#EC4899", "#7C3AED"] },
  { id: "ocean", angle: 160, colors: ["#0EA5E9", "#2563EB", "#1E1B4B"] },
  { id: "forest", angle: 120, colors: ["#A3E635", "#16A34A", "#064E3B"] },
  { id: "aurora", angle: 90, colors: ["#22D3EE", "#34D399", "#A78BFA"] },
  { id: "mono", angle: 180, colors: ["#F8FAFC", "#64748B", "#0F172A"] },
];

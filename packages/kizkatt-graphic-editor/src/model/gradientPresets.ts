import {
  DEFAULT_GRADIENT_FILL,
  normalizeGradientFill,
  type GradientFill
} from "kizkatt-graphic-engine";

export type GradientPreset = {
  custom?: boolean;
  gradient: GradientFill;
  id: string;
  name: string;
};

const PRESET = (
  id: string,
  name: string,
  patch: Partial<GradientFill>
): GradientPreset => ({
  gradient: normalizeGradientFill({
    ...DEFAULT_GRADIENT_FILL,
    ...patch,
    name,
    presetId: id
  }),
  id,
  name
});

export const DEFAULT_GRADIENT_PRESETS: readonly GradientPreset[] = [
  PRESET("black-white", "Black to white", {}),
  PRESET("light-blue-sky", "Light blue sky", {
    stops: [
      { id: "sky", color: "#8ec5fc", opacity: 100, position: 0 },
      { id: "mist", color: "#e0f3ff", opacity: 100, position: 58 },
      { id: "white", color: "#ffffff", opacity: 100, position: 100 }
    ]
  }),
  PRESET("steel-light", "Steel light", {
    rotation: 135,
    stops: [
      { id: "steel-dark", color: "#263238", opacity: 100, position: 0 },
      { id: "steel-light", color: "#eceff1", opacity: 100, position: 42 },
      { id: "steel-mid", color: "#78909c", opacity: 100, position: 70 },
      { id: "steel-end", color: "#111827", opacity: 100, position: 100 }
    ]
  }),
  PRESET("sunset", "Sunset", {
    stops: [
      { id: "sunset-a", color: "#5b21b6", opacity: 100, position: 0 },
      { id: "sunset-b", color: "#db2777", opacity: 100, position: 48 },
      { id: "sunset-c", color: "#fb923c", opacity: 100, position: 100 }
    ]
  }),
  PRESET("rainbow-conic", "Rainbow wheel", {
    type: "conic",
    stops: [
      { id: "rainbow-r1", color: "#ef4444", opacity: 100, position: 0 },
      { id: "rainbow-y", color: "#facc15", opacity: 100, position: 17 },
      { id: "rainbow-g", color: "#22c55e", opacity: 100, position: 34 },
      { id: "rainbow-c", color: "#06b6d4", opacity: 100, position: 51 },
      { id: "rainbow-b", color: "#3b82f6", opacity: 100, position: 68 },
      { id: "rainbow-v", color: "#a855f7", opacity: 100, position: 84 },
      { id: "rainbow-r2", color: "#ef4444", opacity: 100, position: 100 }
    ]
  }),
  PRESET("rings", "Soft rings", {
    spread: "repeat",
    type: "radial",
    stops: [
      { id: "ring-a", color: "#fde68a", opacity: 100, position: 0 },
      { id: "ring-b", color: "#0f766e", opacity: 100, position: 65 },
      { id: "ring-c", color: "#fde68a", opacity: 100, position: 100 }
    ]
  })
];

function rgba(color: string, opacity: number) {
  const alpha = Math.max(0, Math.min(100, opacity)) / 100;
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getGradientCssPreview(value: GradientFill) {
  const gradient = normalizeGradientFill(value);
  const stops = gradient.stops
    .map((stop) => `${rgba(stop.color, stop.opacity)} ${stop.position}%`)
    .join(", ");
  const prefix = gradient.spread === "repeat" ? "repeating-" : "";

  if (gradient.type === "radial") {
    return `${prefix}radial-gradient(ellipse at ${gradient.centerX}% ${gradient.centerY}%, ${stops})`;
  }

  if (gradient.type === "conic") {
    return `${prefix}conic-gradient(from ${gradient.rotation}deg at ${gradient.centerX}% ${gradient.centerY}%, ${stops})`;
  }

  if (gradient.type === "diamond") {
    return `${prefix}radial-gradient(circle at ${gradient.centerX}% ${gradient.centerY}%, ${stops})`;
  }

  return `${prefix}linear-gradient(${gradient.rotation + 90}deg, ${stops})`;
}

export function createCustomGradientPreset(
  gradient: GradientFill,
  id = globalThis.crypto?.randomUUID?.() ?? `gradient-${Date.now()}`
): GradientPreset {
  const normalized = normalizeGradientFill(gradient);
  const name = normalized.name.trim() || "Custom gradient";

  return {
    custom: true,
    gradient: { ...normalized, name, presetId: id },
    id,
    name
  };
}

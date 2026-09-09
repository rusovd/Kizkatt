export type ColorMode = "hex" | "rgba" | "cmyk";

export type RgbColor = {
  b: number;
  g: number;
  r: number;
};

export type HsvaColor = {
  a: number;
  h: number;
  s: number;
  v: number;
};

export type CmykColor = {
  c: number;
  k: number;
  m: number;
  y: number;
};

const HEX_COLOR_PATTERN = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i;
const HEX_RADIX = 16;
const HEX_CHANNEL_LENGTH = 2;
const RGB_MAX = 255;
const HUE_MAX = 360;
const FULL_ALPHA = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 0) {
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

export function isHexColor(value: string) {
  return /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value);
}

export function parseHexColor(value: string): HsvaColor | null {
  const match = HEX_COLOR_PATTERN.exec(value);

  if (!match?.[1]) {
    return null;
  }

  const rgb = {
    r: Number.parseInt(match[1].slice(0, 2), HEX_RADIX),
    g: Number.parseInt(match[1].slice(2, 4), HEX_RADIX),
    b: Number.parseInt(match[1].slice(4, 6), HEX_RADIX)
  };
  const alpha = match[2]
    ? Number.parseInt(match[2], HEX_RADIX) / RGB_MAX
    : FULL_ALPHA;

  return { ...rgbToHsv(rgb), a: alpha };
}

function toHexChannel(value: number) {
  return Math.round(clamp(value, 0, RGB_MAX))
    .toString(HEX_RADIX)
    .padStart(HEX_CHANNEL_LENGTH, "0");
}

export function hsvaToHex(color: HsvaColor) {
  const rgb = hsvToRgb(color);
  const alpha = toHexChannel(color.a * RGB_MAX);
  const opaqueHex = `#${toHexChannel(rgb.r)}${toHexChannel(rgb.g)}${toHexChannel(rgb.b)}`;

  return alpha === "ff" ? opaqueHex : `${opaqueHex}${alpha}`;
}

export function rgbToHsv({ b, g, r }: RgbColor): Omit<HsvaColor, "a"> {
  const normalizedR = r / RGB_MAX;
  const normalizedG = g / RGB_MAX;
  const normalizedB = b / RGB_MAX;
  const maximum = Math.max(normalizedR, normalizedG, normalizedB);
  const minimum = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta > 0) {
    if (maximum === normalizedR) {
      hue = 60 * (((normalizedG - normalizedB) / delta) % 6);
    } else if (maximum === normalizedG) {
      hue = 60 * ((normalizedB - normalizedR) / delta + 2);
    } else {
      hue = 60 * ((normalizedR - normalizedG) / delta + 4);
    }
  }

  if (hue < 0) {
    hue += HUE_MAX;
  }

  return {
    h: hue,
    s: maximum === 0 ? 0 : delta / maximum,
    v: maximum
  };
}

export function hsvToRgb({
  h,
  s,
  v
}: Pick<HsvaColor, "h" | "s" | "v">): RgbColor {
  const chroma = v * s;
  const section = (((h % HUE_MAX) + HUE_MAX) % HUE_MAX) / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  const match = v - chroma;
  let channels: [number, number, number];

  if (section < 1) {
    channels = [chroma, secondary, 0];
  } else if (section < 2) {
    channels = [secondary, chroma, 0];
  } else if (section < 3) {
    channels = [0, chroma, secondary];
  } else if (section < 4) {
    channels = [0, secondary, chroma];
  } else if (section < 5) {
    channels = [secondary, 0, chroma];
  } else {
    channels = [chroma, 0, secondary];
  }

  return {
    r: (channels[0] + match) * RGB_MAX,
    g: (channels[1] + match) * RGB_MAX,
    b: (channels[2] + match) * RGB_MAX
  };
}

export function rgbToCmyk({ b, g, r }: RgbColor): CmykColor {
  const normalizedR = r / RGB_MAX;
  const normalizedG = g / RGB_MAX;
  const normalizedB = b / RGB_MAX;
  const black = 1 - Math.max(normalizedR, normalizedG, normalizedB);

  if (black >= 1) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }

  return {
    c: (1 - normalizedR - black) / (1 - black),
    m: (1 - normalizedG - black) / (1 - black),
    y: (1 - normalizedB - black) / (1 - black),
    k: black
  };
}

export function cmykToRgb({ c, k, m, y }: CmykColor): RgbColor {
  return {
    r: RGB_MAX * (1 - c) * (1 - k),
    g: RGB_MAX * (1 - m) * (1 - k),
    b: RGB_MAX * (1 - y) * (1 - k)
  };
}

function parseFunctionalColorChannels(value: string) {
  const openParenthesis = value.indexOf("(");
  const closeParenthesis = value.lastIndexOf(")");
  const body =
    openParenthesis >= 0 && closeParenthesis > openParenthesis
      ? value.slice(openParenthesis + 1, closeParenthesis)
      : value;

  return body
    .trim()
    .split(/[\s,\/]+/)
    .filter(Boolean);
}

function parsePercentageChannel(value: string) {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) return null;

  return clamp(value.includes("%") || parsed > 1 ? parsed / 100 : parsed, 0, 1);
}

export function formatColorForMode(value: string, mode: ColorMode) {
  const color = parseHexColor(value) ?? { a: 1, h: 0, s: 0, v: 0 };
  const rgb = hsvToRgb(color);

  if (mode === "rgba") {
    return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${round(color.a, 2)})`;
  }

  if (mode === "cmyk") {
    const cmyk = rgbToCmyk(rgb);
    return `cmyk(${Math.round(cmyk.c * 100)}%, ${Math.round(cmyk.m * 100)}%, ${Math.round(cmyk.y * 100)}%, ${Math.round(cmyk.k * 100)}%)`;
  }

  return hsvaToHex(color);
}

export function parseColorForMode(
  value: string,
  mode: ColorMode
): string | null {
  if (mode === "hex") {
    const color = parseHexColor(value);
    return color ? hsvaToHex(color) : null;
  }

  const channels = parseFunctionalColorChannels(value);

  if (mode === "rgba") {
    if (channels.length < 3) return null;
    const rgb = channels.slice(0, 3).map(Number);
    const alphaChannel = channels[3];
    const alpha =
      alphaChannel === undefined
        ? 1
        : alphaChannel.includes("%")
          ? Number.parseFloat(alphaChannel) / 100
          : Number(alphaChannel);

    if (
      rgb.some((channel) => !Number.isFinite(channel)) ||
      !Number.isFinite(alpha)
    ) {
      return null;
    }

    return hsvaToHex({
      ...rgbToHsv({ b: rgb[2], g: rgb[1], r: rgb[0] }),
      a: clamp(alpha, 0, 1)
    });
  }

  if (channels.length < 4) return null;
  const [c, m, y, k] = channels.slice(0, 4).map(parsePercentageChannel);

  if (c === null || m === null || y === null || k === null) return null;
  const rgb = cmykToRgb({ c, k, m, y });

  return hsvaToHex({ ...rgbToHsv(rgb), a: 1 });
}

export function rgbToHexColor(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) => toHexChannel(channel))
    .join("")}`;
}

export function mixHexColor(color: string, target: string, amount: number) {
  const source = parseHexColor(color);
  const destination = parseHexColor(target);

  if (!source || !destination) {
    return color;
  }

  const sourceRgb = hsvToRgb(source);
  const targetRgb = hsvToRgb(destination);

  return hsvaToHex({
    ...rgbToHsv({
      b: sourceRgb.b + (targetRgb.b - sourceRgb.b) * amount,
      g: sourceRgb.g + (targetRgb.g - sourceRgb.g) * amount,
      r: sourceRgb.r + (targetRgb.r - sourceRgb.r) * amount
    }),
    a: source.a
  });
}

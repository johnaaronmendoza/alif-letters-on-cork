/**
 * Freeform letter canvas: the paper is 3:4, and every element is positioned in
 * percentages of the paper (x/w of width, y/h of height), so it renders the same
 * at any size. Elements are stored in the letters.stickers jsonb column; a letter
 * written with the old studio holds plain sticker objects without a `kind`.
 */
export type ElementBase = { id: string; x: number; y: number; w: number; h: number; r: number; z: number };

export type TextEl = ElementBase & { kind: "text"; text: string; font: FontId; color: string; bg: string | null; size: number };
export type LinkEl = ElementBase & { kind: "link"; url: string; label: string };
export type ImageEl = ElementBase & { kind: "image"; src: string };
export type AudioEl = ElementBase & { kind: "audio"; src: string; name: string };
export type VideoEl = ElementBase & { kind: "video"; url: string };
export type StickerEl = ElementBase & { kind: "sticker"; name: StickerName; photo?: string | null };
export type MetaEl = { kind: "meta"; photocard: boolean; paper?: PaperId };

export type CanvasEl = TextEl | LinkEl | ImageEl | AudioEl | VideoEl | StickerEl;
export type ElementKind = CanvasEl["kind"];

/** Width ÷ height of the paper. */
export const PAPER_ASPECT = 3 / 4;

export const CANVAS_FONTS = [
  { id: "poppins", label: "Poppins", cls: "font-clean" },
  { id: "caveat", label: "Caveat", cls: "font-hand" },
  { id: "typewriter", label: "Special Elite", cls: "font-typewriter" },
] as const;
export type FontId = (typeof CANVAS_FONTS)[number]["id"];

export const TEXT_COLORS = ["#2B2B2B", "#FFFFFF", "#D7263D", "#1F4E79", "#2E6B3F", "#6B3FA0", "#8A5A2B"];
export const TEXT_BGS: (string | null)[] = [null, "#FFFFFF", "#2B2B2B", "#F6E27A", "#F4B6C2", "#9CC9E8"];

/** Paper types for the letter sheet (drawn in components/letters/Paper.tsx). */
export const PAPERS = [
  { id: "lined", label: "lined" },
  { id: "notebook", label: "notebook" },
  { id: "plain", label: "plain" },
  { id: "grid", label: "grid" },
  { id: "dotted", label: "dotted" },
  { id: "kraft", label: "kraft" },
  { id: "vintage", label: "vintage" },
  { id: "pink", label: "pink" },
  { id: "airmail", label: "airmail" },
] as const;
export type PaperId = (typeof PAPERS)[number]["id"];
const isPaper = (v: unknown): v is PaperId => PAPERS.some((p) => p.id === v);

/** Fractal-noise texture as a CSS url(), tinted rgb (0–1) at the given alpha. */
const noise = (freq: string, octaves: number, [r, g, b]: [number, number, number], alpha: number, size = 220) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${alpha} 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E") 0 0 / ${size}px ${size}px`;

/** Backgrounds behind the letter: textures from Alif's world, to match the board. */
export const BACKGROUNDS = [
  { id: "cork", label: "cork board", css: `url("/board/cork-tile.webp") 0 0 / 240px auto repeat, #a87a4f` },
  { id: "kraft", label: "kraft paper", css: `${noise(".012 .5", 2, [0.25, 0.16, 0.06], 0.28)}, ${noise(".9", 3, [0.3, 0.2, 0.1], 0.18)}, #c9a679` },
  { id: "desk", label: "wooden desk", css: `repeating-linear-gradient(0deg, transparent 0 158px, rgb(40 20 8 / .35) 158px 160px), ${noise(".004 .22", 3, [0.22, 0.11, 0.04], 0.5, 300)}, linear-gradient(180deg, #91603a, #7d5131)` },
  { id: "denim", label: "denim", css: `repeating-linear-gradient(45deg, rgb(255 255 255 / .07) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, rgb(0 0 0 / .14) 0 1px, transparent 1px 3px), ${noise(".7", 3, [0.85, 0.9, 1], 0.12)}, #3b5579` },
  { id: "tartan", label: "punk tartan", css: `repeating-linear-gradient(0deg, transparent 0 18px, rgb(0 0 0 / .42) 18px 32px, transparent 32px 50px, rgb(255 214 90 / .3) 50px 52px), repeating-linear-gradient(90deg, transparent 0 18px, rgb(0 0 0 / .42) 18px 32px, transparent 32px 50px, rgb(255 214 90 / .3) 50px 52px), ${noise(".8", 2, [0, 0, 0], 0.18)}, #a51d24` },
  { id: "gig", label: "gig night", css: `radial-gradient(ellipse at 50% -10%, rgb(255 236 200 / .22), transparent 55%), ${noise(".9", 3, [1, 1, 1], 0.07)}, #171515` },
  { id: "arsenal", label: "arsenal red", css: `radial-gradient(ellipse at 50% 40%, rgb(255 255 255 / .1), transparent 65%), ${noise(".85", 3, [0.2, 0, 0], 0.22)}, #c4161c` },
  { id: "concrete", label: "concrete", css: `radial-gradient(circle at 20% 30%, rgb(0 0 0 / .08), transparent 25%), radial-gradient(circle at 75% 70%, rgb(0 0 0 / .07), transparent 30%), ${noise(".55", 4, [0.2, 0.2, 0.2], 0.35)}, #a3a19c` },
  { id: "newsprint", label: "newsprint", css: `radial-gradient(circle, rgb(40 40 40 / .16) 0.8px, transparent 1.2px) 0 0 / 5px 5px, repeating-linear-gradient(90deg, transparent 0 180px, rgb(40 40 40 / .12) 180px 181px), ${noise(".9", 2, [0.3, 0.3, 0.25], 0.12)}, #e8e3d6` },
] as const;
export type BackgroundId = (typeof BACKGROUNDS)[number]["id"];

/** Backgrounds from the first version, no longer offered but kept for letters that use them. */
const LEGACY_BACKGROUNDS: Record<string, string> = {
  peach: "radial-gradient(circle at 25% 35%, #f3c6a3 0%, #e7d2c0 38%, #b5c3d6 78%, #9fb3cf 100%)",
  sunset: "linear-gradient(165deg, #7fa3dc 0%, #c9b3d6 35%, #f2a7a0 62%, #f6d6a6 100%)",
  linen: "repeating-linear-gradient(0deg, rgb(120 100 70 / .05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(120 100 70 / .05) 0 1px, transparent 1px 3px), #efe8dc",
  grid: "linear-gradient(rgb(110 130 60 / .22) 1px, transparent 1px) 0 0 / 14px 14px, linear-gradient(90deg, rgb(110 130 60 / .22) 1px, transparent 1px) 0 0 / 14px 14px, #e8ecd6",
  lined: "repeating-linear-gradient(transparent 0 23px, rgb(90 120 170 / .25) 23px 24px), #f8f5ef",
  crumpled: "radial-gradient(ellipse at 20% 30%, rgb(255 255 255 / .7), transparent 40%), radial-gradient(ellipse at 75% 65%, rgb(160 150 130 / .25), transparent 45%), radial-gradient(ellipse at 60% 15%, rgb(150 140 120 / .2), transparent 35%), #e9e4da",
  sage: "radial-gradient(rgb(255 255 255 / .35) 1.2px, transparent 1.6px) 0 0 / 16px 16px, radial-gradient(rgb(60 70 30 / .25) 1px, transparent 1.5px) 8px 8px / 16px 16px, #8fa267",
  meadow: "linear-gradient(180deg, #a8bfd0 0%, #c8d3cf 30%, #6f8a4a 31%, #4d6b33 60%, #2f4524 100%)",
  sky: "linear-gradient(180deg, #6f9bd3 0%, #a9c3e3 45%, #e9d6c6 78%, #f1b98f 100%)",
  night: "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 70%, #fff, transparent), radial-gradient(1px 1px at 85% 60%, #fff, transparent), radial-gradient(1px 1px at 55% 45%, rgb(255 255 255 / .7), transparent), radial-gradient(ellipse at 50% 120%, #2c3a6b, #141b36 70%)",
};

export function backgroundCss(id: string) {
  if (/^#[0-9a-f]{6}$/i.test(id)) return id; // custom color from the "+" swatch
  return BACKGROUNDS.find((b) => b.id === id)?.css ?? LEGACY_BACKGROUNDS[id] ?? BACKGROUNDS[0].css;
}

/**
 * Sticker pack: images in /public/stickers/<file>.webp.
 * aspect = height ÷ width, w = default width in % of the paper.
 */
const PACK: [file: number, aspect: number, w: number][] = [
  [6, 0.965, 18], [7, 1.083, 18], [8, 1.143, 18], [9, 1.104, 18], [10, 1.275, 18], [31, 1.053, 18],
  [11, 0.762, 32], [12, 0.644, 32], [13, 0.525, 32], [14, 1.02, 32], [15, 0.975, 32], [32, 1.042, 32],
  [21, 0.994, 18], [22, 0.962, 18], [23, 1.01, 18], [19, 1.074, 18], [20, 1.0, 26], [24, 0.512, 24],
  [25, 0.315, 36], [26, 0.285, 36], [36, 0.19, 30], [18, 1.014, 18], [30, 0.963, 18], [37, 0.838, 18],
  [27, 1.193, 18], [29, 1.074, 18], [33, 1.516, 18], [34, 0.892, 18], [35, 1.221, 18], [38, 1.123, 18],
  [28, 1.053, 22],
];
const PACK_SHAPE = new Map(PACK.map(([file, aspect, w]) => [`s${file}`, { aspect, w, file }]));
const PACK_LABEL: Record<number, string> = {
  6: "heart doodle", 7: "star doodle", 8: "bow doodle", 9: "cherries", 10: "flame", 31: "sparkles",
  11: "torn paper", 12: "grid paper", 13: "taped note", 14: "sticky note", 15: "torn page", 32: "clipped note",
  21: "blue button", 22: "heart button", 23: "green button", 19: "gem hearts", 20: "rhinestones", 24: "red bow",
  25: "green washi tape", 26: "pink washi tape", 36: "row of hearts", 18: "blue burst", 30: "yellow star", 37: "shrimp",
  27: "eye storm", 29: "green skull", 33: "lightning bolt", 34: "rock stars", 35: "raccoon", 38: "push pin",
  28: "Alif's face",
};
/** Human name for a sticker, for screen readers. */
export function stickerLabel(name: string) {
  const s = PACK_SHAPE.get(name);
  return (s && PACK_LABEL[s.file]) ?? name.replace(/-/g, " ");
}
const PAGE_SIZE = 6;
/** Sticker ids grouped into sidebar pages of six (doodles, notes, crafts, tape & bits, edgy, …). */
export const STICKER_PAGES: string[][] = Array.from({ length: Math.ceil(PACK.length / PAGE_SIZE) }, (_, p) =>
  PACK.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE).map(([file]) => `s${file}`),
);
export type StickerName = string;

/** Image URL for a sticker from the pack, or null for an original drawn sticker. */
export function stickerSrc(name: string) {
  const s = PACK_SHAPE.get(name);
  return s ? `/stickers/${s.file}.webp` : null;
}

export function stickerShape(name: string): { aspect: number; w: number; frame?: boolean } {
  return PACK_SHAPE.get(name) ?? LEGACY_SHAPE[name as LegacyStickerName] ?? { aspect: 1, w: 16 };
}

/** Original drawn stickers. No longer offered, but still rendered for letters that use them. */
const LEGACY_STICKER_PAGES = [
  ["note-tape", "note-clip", "ticket", "torn-kraft", "i-love-you", "kraft-hearts"],
  ["popup", "browser", "player", "tv", "film-frame", "film-strip"],
  ["heart", "star", "cherry", "tulip", "bow", "moon"],
] as const;
export type LegacyStickerName = (typeof LEGACY_STICKER_PAGES)[number][number];

const LEGACY_SHAPE: Record<LegacyStickerName, { aspect: number; w: number; frame?: boolean }> = {
  "note-tape": { aspect: 0.92, w: 26 },
  "note-clip": { aspect: 0.8, w: 28 },
  ticket: { aspect: 0.5, w: 30 },
  "torn-kraft": { aspect: 0.42, w: 30 },
  "i-love-you": { aspect: 0.3, w: 26 },
  "kraft-hearts": { aspect: 0.5, w: 28 },
  popup: { aspect: 1.45, w: 26, frame: true },
  browser: { aspect: 0.74, w: 30, frame: true },
  player: { aspect: 1.62, w: 24, frame: true },
  tv: { aspect: 0.72, w: 30, frame: true },
  "film-frame": { aspect: 0.92, w: 26, frame: true },
  "film-strip": { aspect: 0.32, w: 32, frame: true },
  heart: { aspect: 1, w: 12 },
  star: { aspect: 1, w: 12 },
  cherry: { aspect: 1, w: 12 },
  tulip: { aspect: 1, w: 12 },
  bow: { aspect: 1, w: 12 },
  moon: { aspect: 1, w: 12 },
};

/** % height on the paper for an element of width w% with the given height÷width. */
export const heightFor = (w: number, aspect: number) => w * aspect * PAPER_ASPECT;

export const uid = () => crypto.randomUUID().slice(0, 8);

export function isCanvasLetter(stickers: unknown): boolean {
  return Array.isArray(stickers) && stickers.some((s) => s && typeof s === "object" && "kind" in s);
}

export function readCanvas(stickers: unknown): { elements: CanvasEl[]; photocard: boolean; paper: PaperId } {
  if (!Array.isArray(stickers)) return { elements: [], photocard: false, paper: "lined" };
  const meta = stickers.find((s) => s?.kind === "meta") as MetaEl | undefined;
  return {
    elements: stickers.filter((s) => s?.kind && s.kind !== "meta") as CanvasEl[],
    photocard: !!meta?.photocard,
    paper: isPaper(meta?.paper) ? meta.paper : "lined",
  };
}

/** Video links that play inline. Anything else is shown as a plain link. */
export function parseVideo(url: string): { type: "iframe" | "file"; src: string; thumb?: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let yt: string | null = null;
    if (host === "youtu.be") yt = u.pathname.slice(1);
    else if (host.endsWith("youtube.com")) yt = u.searchParams.get("v") ?? u.pathname.match(/\/(shorts|embed|live)\/([^/?]+)/)?.[2] ?? null;
    if (yt && /^[\w-]{6,}$/.test(yt))
      return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt}`, thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` };
    const vimeo = host.endsWith("vimeo.com") ? u.pathname.match(/\/(\d+)/)?.[1] : null;
    if (vimeo) return { type: "iframe", src: `https://player.vimeo.com/video/${vimeo}` };
    if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { type: "file", src: u.toString() };
    return null;
  } catch {
    return null;
  }
}

export function safeUrl(url: string) {
  const v = url.trim();
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function plainText(elements: CanvasEl[]) {
  return elements
    .filter((e): e is TextEl => e.kind === "text")
    .map((e) => e.text.trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 2000);
}

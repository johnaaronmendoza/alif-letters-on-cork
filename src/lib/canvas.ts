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
export type MetaEl = { kind: "meta"; photocard: boolean };

export type CanvasEl = TextEl | LinkEl | ImageEl | AudioEl | VideoEl | StickerEl;
export type ElementKind = CanvasEl["kind"];

/** Width ÷ height of the paper. */
export const PAPER_ASPECT = 3 / 4;

export const CANVAS_FONTS = [
  { id: "caveat", label: "Caveat", cls: "font-hand" },
  { id: "typewriter", label: "Special Elite", cls: "font-typewriter" },
  { id: "poppins", label: "Poppins", cls: "font-clean" },
] as const;
export type FontId = (typeof CANVAS_FONTS)[number]["id"];

export const TEXT_COLORS = ["#2B2B2B", "#FFFFFF", "#D7263D", "#1F4E79", "#2E6B3F", "#6B3FA0", "#8A5A2B"];
export const TEXT_BGS: (string | null)[] = [null, "#FFFFFF", "#2B2B2B", "#F6E27A", "#F4B6C2", "#9CC9E8"];

export const BACKGROUNDS = [
  { id: "peach", label: "peach haze", css: "radial-gradient(circle at 25% 35%, #f3c6a3 0%, #e7d2c0 38%, #b5c3d6 78%, #9fb3cf 100%)" },
  { id: "sunset", label: "sunset", css: "linear-gradient(165deg, #7fa3dc 0%, #c9b3d6 35%, #f2a7a0 62%, #f6d6a6 100%)" },
  { id: "linen", label: "linen", css: "repeating-linear-gradient(0deg, rgb(120 100 70 / .05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(120 100 70 / .05) 0 1px, transparent 1px 3px), #efe8dc" },
  { id: "grid", label: "green grid", css: "linear-gradient(rgb(110 130 60 / .22) 1px, transparent 1px) 0 0 / 14px 14px, linear-gradient(90deg, rgb(110 130 60 / .22) 1px, transparent 1px) 0 0 / 14px 14px, #e8ecd6" },
  { id: "lined", label: "lined", css: "repeating-linear-gradient(transparent 0 23px, rgb(90 120 170 / .25) 23px 24px), #f8f5ef" },
  { id: "crumpled", label: "crumpled", css: "radial-gradient(ellipse at 20% 30%, rgb(255 255 255 / .7), transparent 40%), radial-gradient(ellipse at 75% 65%, rgb(160 150 130 / .25), transparent 45%), radial-gradient(ellipse at 60% 15%, rgb(150 140 120 / .2), transparent 35%), #e9e4da" },
  { id: "sage", label: "sage", css: "radial-gradient(rgb(255 255 255 / .35) 1.2px, transparent 1.6px) 0 0 / 16px 16px, radial-gradient(rgb(60 70 30 / .25) 1px, transparent 1.5px) 8px 8px / 16px 16px, #8fa267" },
  { id: "meadow", label: "meadow", css: "linear-gradient(180deg, #a8bfd0 0%, #c8d3cf 30%, #6f8a4a 31%, #4d6b33 60%, #2f4524 100%)" },
  { id: "sky", label: "sky", css: "linear-gradient(180deg, #6f9bd3 0%, #a9c3e3 45%, #e9d6c6 78%, #f1b98f 100%)" },
  { id: "night", label: "night", css: "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 70%, #fff, transparent), radial-gradient(1px 1px at 85% 60%, #fff, transparent), radial-gradient(1px 1px at 55% 45%, rgb(255 255 255 / .7), transparent), radial-gradient(ellipse at 50% 120%, #2c3a6b, #141b36 70%)" },
] as const;
export type BackgroundId = (typeof BACKGROUNDS)[number]["id"];

export function backgroundCss(id: string) {
  if (/^#[0-9a-f]{6}$/i.test(id)) return id; // custom color from the "+" swatch
  return BACKGROUNDS.find((b) => b.id === id)?.css ?? BACKGROUNDS[0].css;
}

/** Stickers: paper scraps, photo frames (hold a photo) and a few cute ones. */
export const STICKER_PAGES = [
  ["note-tape", "note-clip", "ticket", "torn-kraft", "i-love-you", "kraft-hearts"],
  ["popup", "browser", "player", "tv", "film-frame", "film-strip"],
  ["heart", "star", "cherry", "tulip", "bow", "moon"],
] as const;
export type StickerName = (typeof STICKER_PAGES)[number][number];

/** Height ÷ width of each sticker, and its default width in % of the paper. */
export const STICKER_SHAPE: Record<StickerName, { aspect: number; w: number; frame?: boolean }> = {
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

export function readCanvas(stickers: unknown): { elements: CanvasEl[]; photocard: boolean } {
  if (!Array.isArray(stickers)) return { elements: [], photocard: false };
  const meta = stickers.find((s) => s?.kind === "meta") as MetaEl | undefined;
  return {
    elements: stickers.filter((s) => s?.kind && s.kind !== "meta") as CanvasEl[],
    photocard: !!meta?.photocard,
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

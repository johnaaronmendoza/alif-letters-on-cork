import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Letter = Database["public"]["Tables"]["letters"]["Row"];
export type Sticker = { type: string; x: number; y: number; rotation: number; scale: number };

export const PAPER_STYLES = [
  { id: "lined", label: "lined notebook", kind: "letter" },
  { id: "kraft", label: "kraft envelope", kind: "envelope" },
  { id: "airmail", label: "airmail", kind: "envelope" },
  { id: "polaroid", label: "polaroid", kind: "polaroid" },
  { id: "postcard", label: "postcard", kind: "postcard" },
  { id: "grid", label: "grid paper", kind: "letter" },
  { id: "pink", label: "pastel pink", kind: "letter" },
  { id: "cream", label: "cream", kind: "letter" },
] as const;

export const FONTS = [
  { id: "poppins", label: "Poppins", cls: "font-clean" },
  { id: "caveat", label: "Caveat", cls: "font-hand" },
  { id: "typewriter", label: "Special Elite", cls: "font-typewriter" },
] as const;
/** Fonts that were removed, mapped to their closest replacement for older letters. */
const RETIRED_FONTS: Record<string, string> = { patrick: "font-hand", inter: "font-clean" };

export const PIN_COLORS = ["#D7263D", "#9CC9E8", "#F6E27A", "#F4B6C2", "#7BC47F", "#2B2B2B"];

/** Readable symbol color (ink or white) for a given seal background. */
export function sealText(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#2B2B2B" : "#ffffff";
}

export function fontClass(id: string) {
  return FONTS.find((f) => f.id === id)?.cls ?? RETIRED_FONTS[id] ?? "font-hand";
}
export function paperKind(id: string) {
  return PAPER_STYLES.find((p) => p.id === id)?.kind ?? "letter";
}

/** Anonymous per-browser id used for the 5-per-hour limit. */
export function getBrowserId() {
  let id = localStorage.getItem("alif-browser-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("alif-browser-id", id);
  }
  return id;
}

/**
 * Board layout. Alif's collage is the board; letters pin into the open cork
 * around the artwork (ART_SLOTS, copied from the mockup), in pinning order.
 * Past those, the cork extends below the collage in rows of EXT_COLS.
 * Positions are computed here rather than read from the database, so every
 * viewer sees the same layout and gaps left by deleted letters fill in.
 * x is % of board width; y is % of the collage's height (over 100 = below it).
 */
export const ART_ASPECT = 3648 / 1968;
const ART_FRAME = { x: 50, y: 50, w: 1900, h: 1025 }; // mockup px (2000×1125) → cropped collage
const MOCKUP: [number, number, number][] = [
  // [centre x, centre y, rotation] in mockup pixels, in the order they fill
  [200, 170, -3], [1660, 160, 3], [757, 160, 1], [1430, 942, -2], [480, 940, 2], [1487, 390, -1], [533, 378, 2],
  [1780, 932, 3], [455, 195, -2], [1362, 180, 2], [757, 940, -1], [1778, 335, 2], [1172, 903, -3], [668, 743, -2],
];
export const ART_SLOTS = MOCKUP.map(([cx, cy, r]) => ({
  x: ((cx - ART_FRAME.x) / ART_FRAME.w) * 100,
  y: ((cy - ART_FRAME.y) / ART_FRAME.h) * 100,
  r,
}));
export const EXT_COLS = 7;
/** Height of one extension row, in % of the collage height. */
export const EXT_ROW = 24;
const EXT_PAD = 4;

/** Small stable number in [-1, 1) from a letter id, for natural-looking jitter. */
export function jitter(id: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 2000) / 1000 - 1;
}

export type BoardSpot = { x: number; y: number; r: number };

/**
 * Envelope colors. `name` matches the photo in /public/board/envelopes; the rest
 * are sampled from those photos so the opened envelope matches the one on the board.
 */
export const ENVELOPE_COLORS = [
  { name: "sage", paper: "#cbd6c3", shade: "#aebba5", inside: "#9dac94", ink: "#3d4a37" },
  { name: "butter", paper: "#efd29f", shade: "#d8b77c", inside: "#c4a066", ink: "#5a4421" },
  { name: "white", paper: "#ece8dc", shade: "#d3cebf", inside: "#bdb7a6", ink: "#4a4538" },
  { name: "pink", paper: "#eeb2a9", shade: "#d6948a", inside: "#c07f76", ink: "#5e2f29" },
  { name: "blue", paper: "#b4cadb", shade: "#93acc1", inside: "#7f99b0", ink: "#2d4357" },
] as const;
export type EnvelopeColor = (typeof ENVELOPE_COLORS)[number];

/** The envelope a letter is shown in, stable per letter. */
export function envelopeFor(id: string): EnvelopeColor {
  return ENVELOPE_COLORS[Math.floor((jitter(id, 7) + 1) * 2.5) % ENVELOPE_COLORS.length]!;
}

/** Places letters (oldest first) and returns the board height in % of the collage height. */
export function layoutBoard(ls: Pick<Letter, "id" | "created_at">[]) {
  const ordered = [...ls].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const spots = new Map<string, BoardSpot>();
  ordered.forEach((l, i) => {
    const slot = ART_SLOTS[i];
    if (slot) {
      spots.set(l.id, { x: slot.x, y: slot.y, r: slot.r + jitter(l.id, 1) });
      return;
    }
    const k = i - ART_SLOTS.length;
    const row = Math.floor(k / EXT_COLS), col = k % EXT_COLS;
    spots.set(l.id, {
      x: ((col + 0.5) / EXT_COLS) * 100 + jitter(l.id, 2) * 2,
      y: 100 + EXT_PAD + (row + 0.5) * EXT_ROW + jitter(l.id, 3) * 2,
      r: jitter(l.id, 4) * 4,
    });
  });
  const extra = Math.max(0, ordered.length - ART_SLOTS.length);
  const height = extra ? 100 + EXT_PAD + Math.ceil(extra / EXT_COLS) * EXT_ROW + 2 : 100;
  return { spots, height };
}

/** Values stored with a new letter; the board layout itself is computed by layoutBoard. */
export function newBoardMeta() {
  return { board_x: 50, board_y: 50, rotation: Math.round((Math.random() * 6 - 3) * 10) / 10 };
}

/** Media are stored as "bucket/path" in private buckets; resolve via signed URL. */
const urlCache = new Map<string, string>();
export async function resolveMedia(ref: string | null) {
  if (!ref) return null;
  if (urlCache.has(ref)) return urlCache.get(ref)!;
  const [bucket = "photos", ...rest] = ref.split("/");
  const { data } = await supabase.storage.from(bucket).createSignedUrl(rest.join("/"), 60 * 60 * 24);
  if (data?.signedUrl) urlCache.set(ref, data.signedUrl);
  return data?.signedUrl ?? null;
}

export async function uploadMedia(bucket: "photos" | "signatures", blob: Blob, ext: string) {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return `${bucket}/${path}`;
}

export function isLocked(l: Pick<Letter, "unlock_at">, now = Date.now()) {
  return !!l.unlock_at && new Date(l.unlock_at).getTime() > now;
}
export function countdown(iso: string, now = Date.now()) {
  const ms = Math.max(0, new Date(iso).getTime() - now);
  const d = Math.floor(ms / 86400000), h = Math.floor((ms / 3600000) % 24), m = Math.floor((ms / 60000) % 60), s = Math.floor((ms / 1000) % 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

/** Short synthesized pin "thunk". */
export function playThunk() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(180, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.2);
    setTimeout(() => ctx.close(), 400);
  } catch { /* ignore */ }
}

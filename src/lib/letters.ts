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
  { id: "caveat", label: "Caveat", cls: "font-hand" },
  { id: "patrick", label: "Patrick Hand", cls: "font-patrick" },
  { id: "typewriter", label: "Special Elite", cls: "font-typewriter" },
  { id: "inter", label: "Inter", cls: "font-clean" },
] as const;

export const INK_COLORS = ["#2B2B2B", "#1F4E79", "#D7263D", "#2E6B3F", "#6B3FA0", "#8A5A2B"];
export const PIN_COLORS = ["#D7263D", "#9CC9E8", "#F6E27A", "#F4B6C2", "#7BC47F", "#2B2B2B"];
export const SEAL_COLORS = ["#D7263D", "#7A1E2C", "#9CC9E8", "#F6E27A", "#2E6B3F", "#6B3FA0"];
export const SEAL_SYMBOLS = ["♡", "★", "☾", "✿", "A", "☀"];
export const OPEN_WHEN = ["you miss me", "you need a laugh", "it's your birthday", "you're stressed", "you can't sleep"];
export const STICKERS = ["❤️", "💖", "⭐", "✨", "🍒", "🍓", "🌼", "🌷", "🌙", "🦋", "📮", "💌", "🎀", "🧸", "☁️", "🐰"];

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
  return FONTS.find((f) => f.id === id)?.cls ?? "font-hand";
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

/** Grid of slots with jitter; picks the free slot farthest from existing letters. */
export const GRID_COLS = 7;
export const GRID_ROWS = 4;
export function pickBoardSpot(existing: { board_x: number; board_y: number }[]) {
  const slots: { x: number; y: number }[] = [];
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++)
      slots.push({ x: ((c + 0.5) / GRID_COLS) * 100, y: ((r + 0.5) / GRID_ROWS) * 100 });
  const minDist = (s: { x: number; y: number }) =>
    existing.reduce((m, e) => Math.min(m, Math.hypot(e.board_x - s.x, (e.board_y - s.y) * 0.625)), Infinity);
  const free = slots.filter((s) => minDist(s) > 7);
  const pool = free.length ? free : slots;
  const slot = pool[Math.floor(Math.random() * pool.length)] ?? { x: 50, y: 50 };
  const jx = (100 / GRID_COLS) * 0.18, jy = (100 / GRID_ROWS) * 0.15;
  return {
    board_x: clamp(slot.x + (Math.random() * 2 - 1) * jx, 6, 94),
    board_y: clamp(slot.y + (Math.random() * 2 - 1) * jy, 9, 91),
    rotation: Math.round((Math.random() * 16 - 8) * 10) / 10,
  };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

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

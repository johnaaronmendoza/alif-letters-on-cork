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
 * Board layout. Letters pin onto the cork below the collage artwork. That area is
 * GRID_COLS wide and grows downward one row at a time, starting at MIN_ROWS.
 * board_x is % of board width; board_y is % of ONE base page (16:10, GRID_ROWS rows),
 * so values above 100 mean the letter sits on an added row further down.
 */
export const GRID_COLS = 7;
export const GRID_ROWS = 4;
export const ROW_H = 100 / GRID_ROWS;
/** The cork under the collage starts this many rows tall, then grows. */
export const MIN_ROWS = 2;

/** Rows the board needs to show every letter (never fewer than one base page). */
export function boardRows(ls: { board_y: number }[]) {
  const lastRow = ls.reduce((m, l) => Math.max(m, Math.floor(l.board_y / ROW_H)), 0);
  return Math.max(MIN_ROWS, lastRow + 1);
}

/** Picks the top-most free slot; adds a new row only when every slot is taken. */
export function pickBoardSpot(existing: { board_x: number; board_y: number }[]) {
  const minDist = (s: { x: number; y: number }) =>
    existing.reduce((m, e) => Math.min(m, Math.hypot(e.board_x - s.x, (e.board_y - s.y) * 0.625)), Infinity);
  const startRows = boardRows(existing);
  for (let rows = startRows; rows < startRows + 200; rows++) {
    const free: { x: number; y: number; r: number }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < GRID_COLS; c++) {
        const slot = { x: ((c + 0.5) / GRID_COLS) * 100, y: (r + 0.5) * ROW_H, r };
        if (minDist(slot) > 7) free.push(slot);
      }
    if (!free.length) continue;
    const topRow = Math.min(...free.map((f) => f.r));
    const row = free.filter((f) => f.r === topRow);
    const slot = row[Math.floor(Math.random() * row.length)]!;
    const jx = (100 / GRID_COLS) * 0.18;
    return {
      board_x: clamp(slot.x + (Math.random() * 2 - 1) * jx, 6, 94),
      board_y: clamp(slot.y + (Math.random() * 2 - 1) * 3, slot.r * ROW_H + 9, (slot.r + 1) * ROW_H - 9),
      rotation: Math.round((Math.random() * 12 - 6) * 10) / 10,
    };
  }
  return { board_x: 50, board_y: startRows * ROW_H + ROW_H / 2, rotation: 0 };
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

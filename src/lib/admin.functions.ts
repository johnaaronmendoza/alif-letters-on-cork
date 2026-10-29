import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function checkPassword(input: string) {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected) throw new Error("ADMIN_PASSWORD is not set");
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(input)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

export const adminCheck = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => ({ ok: await checkPassword(data.password) }));

/** Storage paths ("bucket/path") a letter refers to: its photocard plus any canvas media. */
function mediaRefs(row: { photo_url: string | null; signature_url: string | null; stickers: unknown }) {
  const refs = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v && !/^(https?:|blob:|data:)/.test(v)) refs.add(v);
  };
  add(row.photo_url);
  add(row.signature_url);
  if (Array.isArray(row.stickers)) for (const el of row.stickers as Record<string, unknown>[]) { add(el?.src); add(el?.photo); }
  return [...refs];
}

/** Deletes the given letters and the files they uploaded. */
async function deleteLetters(filter: { id?: string; all?: true }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin.from("letters").select("id, photo_url, signature_url, stickers");
  if (filter.id) query = query.eq("id", filter.id);
  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  if (!rows?.length) return 0;

  // group files by bucket and remove them; a missing file is not an error
  const byBucket = new Map<string, string[]>();
  for (const row of rows) for (const ref of mediaRefs(row)) {
    const [bucket = "", ...rest] = ref.split("/");
    if (!bucket || !rest.length) continue;
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), rest.join("/")]);
  }
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += 100) await supabaseAdmin.storage.from(bucket).remove(paths.slice(i, i + 100));
  }

  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { error: delError } = await supabaseAdmin.from("letters").delete().in("id", ids.slice(i, i + 200));
    if (delError) throw new Error(delError.message);
  }
  return ids.length;
}

export const adminDeleteLetter = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(200), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkPassword(data.password))) throw new Error("Wrong password");
    await deleteLetters({ id: data.id });
    return { ok: true };
  });

/** Clears the whole board: every letter and every file they uploaded. */
export const adminClearBoard = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(200), confirm: z.literal("clear the board") }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkPassword(data.password))) throw new Error("Wrong password");
    return { deleted: await deleteLetters({ all: true }) };
  });

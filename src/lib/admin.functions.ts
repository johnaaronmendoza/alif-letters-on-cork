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

export const adminDeleteLetter = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(200), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkPassword(data.password))) throw new Error("Wrong password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("letters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

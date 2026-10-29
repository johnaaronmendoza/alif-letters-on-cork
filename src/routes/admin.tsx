import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminCheck, adminDeleteLetter } from "@/lib/admin.functions";
import type { Letter } from "@/lib/letters";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "admin — for alif ♡" },
      { name: "description", content: "Manage letters pinned to Alif's corkboard." },
      { property: "og:title", content: "admin — for alif ♡" },
      { property: "og:description", content: "Manage letters pinned to Alif's corkboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const check = useServerFn(adminCheck);
  const del = useServerFn(adminDeleteLetter);
  const [pw, setPw] = useState("");
  const [ok, setOk] = useState(false);
  const [letters, setLetters] = useState<Letter[]>([]);

  const load = () => supabase.from("letters").select("*").order("created_at", { ascending: false }).then(({ data }) => setLetters(data ?? []));

  return (
    <main className="wall min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="font-hand text-xl text-ink/70">← back to the board</Link>
        <h1 className="mt-2 font-title text-5xl text-ink">admin</h1>
        {!ok ? (
          <form className="mt-6 flex gap-2" onSubmit={async (e) => {
            e.preventDefault();
            const r = await check({ data: { password: pw } });
            if (r.ok) { setOk(true); load(); } else toast.error("wrong password");
          }}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="password" className="rounded-md border border-ink/20 bg-card px-3 py-2" />
            <button className="bg-ink px-4 py-2 text-cream">enter</button>
          </form>
        ) : (
          <ul className="mt-6 space-y-3">
            {letters.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-4 bg-card p-4 shadow-item">
                <div className="min-w-0">
                  <div className="font-hand text-xl">from {l.from_name} · <span className="text-sm text-ink/60">{new Date(l.created_at).toLocaleString()}</span></div>
                  <p className="line-clamp-2 text-sm text-ink/80">{l.body}</p>
                </div>
                <button className="shrink-0 bg-cherry px-3 py-1.5 text-sm text-primary-foreground" onClick={async () => {
                  if (!confirm(`delete the letter from ${l.from_name}?`)) return;
                  try { await del({ data: { password: pw, id: l.id } }); setLetters((x) => x.filter((y) => y.id !== l.id)); toast.success("deleted"); }
                  catch { toast.error("couldn't delete"); }
                }}>delete</button>
              </li>
            ))}
            {!letters.length && <p className="font-hand text-xl">no letters yet.</p>}
          </ul>
        )}
      </div>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  FONTS, INK_COLORS, OPEN_WHEN, PAPER_STYLES, PIN_COLORS, SEAL_COLORS, SEAL_SYMBOLS, STICKERS,
  getBrowserId, pickBoardSpot, uploadMedia, type Letter, type Sticker,
} from "@/lib/letters";
import { LetterPaper, paperBg, type PaperData } from "./LetterPaper";

const STEPS = ["style", "write", "decorate", "seal"] as const;

export function LetterStudio({ letters, onClose, onPinned }: { letters: Letter[]; onClose: () => void; onPinned: (l: Letter) => void }) {
  const [step, setStep] = useState<(typeof STEPS)[number]>("style");
  const [d, setD] = useState<PaperData>({
    from_name: "", open_when_label: "you miss me", body: "", paper_style: "cream", font: "caveat",
    ink_color: "#2B2B2B", stickers: [], photo_url: null, signature_url: null,
  });
  const [customWhen, setCustomWhen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sig, setSig] = useState<string | null>(null);
  const [pin, setPin] = useState(PIN_COLORS[0]);
  const [sealColor, setSealColor] = useState(SEAL_COLORS[0]);
  const [sealSymbol, setSealSymbol] = useState(SEAL_SYMBOLS[0]);
  const [unlock, setUnlock] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<PaperData>) => setD((x) => ({ ...x, ...p }));

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const addSticker = (type: string) =>
    set({ stickers: [...d.stickers, { type, x: 15 + Math.random() * 65, y: 15 + Math.random() * 60, rotation: Math.round(Math.random() * 30 - 15), scale: 1 + Math.random() * 0.4 }] });

  const submit = async () => {
    if (!d.body.trim()) { setStep("write"); return toast.error("write alif something first ♡"); }
    setBusy(true);
    try {
      const photo_url = photo ? await uploadMedia("photos", photo, photo.name.split(".").pop() || "jpg") : null;
      const signature_url = sig ? await uploadMedia("signatures", await (await fetch(sig)).blob(), "png") : null;
      const spot = pickBoardSpot(letters);
      const { data, error } = await supabase.from("letters").insert({
        from_name: d.from_name.trim().slice(0, 60) || "anonymous",
        open_when_label: d.open_when_label.trim().slice(0, 80),
        body: d.body.slice(0, 2000), paper_style: d.paper_style, font: d.font, ink_color: d.ink_color,
        stickers: d.stickers, photo_url, signature_url, seal_color: sealColor, seal_symbol: sealSymbol,
        pin_color: pin, unlock_at: unlock ? new Date(unlock).toISOString() : null, browser_id: getBrowserId(), ...spot,
      }).select("*").single();
      if (error) throw error;
      onPinned(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      toast.error(msg.includes("rate_limited") ? "you've pinned 5 letters this hour — take a breather and come back soon ♡" : "couldn't pin that one, try again?");
    } finally { setBusy(false); }
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-ink bg-ink text-cream" : "border-ink/20 bg-card hover:border-ink/50"}`;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, rotate: -1 }} animate={{ y: 0, rotate: 0 }} exit={{ y: 60 }}
        className="paper-cream relative flex h-full w-full flex-col overflow-hidden shadow-paper sm:h-[90vh] sm:max-w-6xl sm:rounded-lg"
      >
        <header className="flex items-center justify-between border-b border-ink/10 px-5 py-3">
          <h2 className="font-hand text-3xl text-ink">letter studio ✎</h2>
          <button onClick={onClose} aria-label="close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5"><X className="h-5 w-5" /></button>
        </header>
        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1.1fr_1fr] lg:overflow-hidden">
          <div className="bg-cork-soft p-4 sm:p-8 lg:overflow-y-auto">
            <div className="mx-auto max-w-md">
              <LetterPaper data={d} photoPreview={photoPreview} signaturePreview={sig} onStickersChange={step === "decorate" ? (s) => set({ stickers: s }) : undefined} />
              {step === "decorate" && <p className="mt-2 text-center font-hand text-lg text-cream">drag stickers around · double-click to remove</p>}
            </div>
          </div>
          <div className="flex min-h-0 flex-col">
            <nav className="flex gap-1 px-4 pt-4">
              {STEPS.map((s, i) => (
                <button key={s} onClick={() => setStep(s)} className={`flex-1 -rotate-1 rounded-t-md px-2 py-2 font-hand text-xl transition ${step === s ? "bg-butter text-ink shadow-sm" : "bg-ink/5 text-ink/60 hover:bg-ink/10"}`} style={{ rotate: `${(i % 2 ? 1 : -1) * 1.5}deg` }}>
                  {i + 1}. {s}
                </button>
              ))}
            </nav>
            <div className="flex-1 space-y-5 overflow-y-auto border-t border-ink/10 p-5">
              {step === "style" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PAPER_STYLES.map((p) => (
                    <button key={p.id} onClick={() => set({ paper_style: p.id })} className={`flex flex-col items-center gap-1.5 rounded-md p-2 transition ${d.paper_style === p.id ? "bg-butter/60 ring-2 ring-ink" : "hover:bg-ink/5"}`}>
                      <span className={`block aspect-[3/4] w-full shadow-item ${paperBg[p.id]}`} />
                      <span className="text-xs text-ink">{p.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {step === "write" && (
                <>
                  <Field label="open when…">
                    <div className="flex flex-wrap gap-2">
                      {OPEN_WHEN.map((o) => <button key={o} onClick={() => { setCustomWhen(false); set({ open_when_label: o }); }} className={chip(!customWhen && d.open_when_label === o)}>{o}</button>)}
                      <button onClick={() => { setCustomWhen(true); set({ open_when_label: "" }); }} className={chip(customWhen)}>custom…</button>
                    </div>
                    {customWhen && <input maxLength={80} autoFocus value={d.open_when_label} onChange={(e) => set({ open_when_label: e.target.value })} placeholder="you…" className="mt-2 w-full rounded-md border border-ink/20 bg-card px-3 py-2" />}
                  </Field>
                  <Field label={`your letter (${d.body.length}/2000)`}>
                    <textarea maxLength={2000} rows={8} value={d.body} onChange={(e) => set({ body: e.target.value })} placeholder="dear alif," className="w-full resize-none rounded-md border border-ink/20 bg-card px-3 py-2 font-hand text-xl" />
                  </Field>
                  <Field label="font">
                    <div className="flex flex-wrap gap-2">{FONTS.map((f) => <button key={f.id} onClick={() => set({ font: f.id })} className={`${chip(d.font === f.id)} ${f.cls}`}>{f.label}</button>)}</div>
                  </Field>
                  <Field label="ink"><Swatches colors={INK_COLORS} value={d.ink_color} onChange={(c) => set({ ink_color: c })} /></Field>
                </>
              )}
              {step === "decorate" && (
                <>
                  <Field label="stickers (tap to add)">
                    <div className="grid grid-cols-8 gap-1">{STICKERS.map((s) => <button key={s} onClick={() => addSticker(s)} className="rounded-md p-1 text-2xl transition hover:scale-125 hover:bg-ink/5">{s}</button>)}</div>
                    {d.stickers.length > 0 && <button onClick={() => set({ stickers: [] })} className="mt-2 text-xs underline">clear stickers</button>}
                  </Field>
                  <Field label="photo (optional, shown as a taped polaroid)">
                    <input type="file" accept="image/*" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 5 * 1024 * 1024) return toast.error("photo must be under 5MB");
                      setPhoto(f); setPhotoPreview(URL.createObjectURL(f));
                    }} className="text-sm" />
                    {photo && <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} className="ml-2 text-xs underline">remove</button>}
                  </Field>
                  <Field label="pin / tape color"><Swatches colors={PIN_COLORS} value={pin} onChange={setPin} /></Field>
                </>
              )}
              {step === "seal" && (
                <>
                  <Field label="wax seal">
                    <div className="flex items-center gap-4">
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl text-primary-foreground shadow-pin" style={{ background: sealColor }}>{sealSymbol}</span>
                      <div className="space-y-2">
                        <Swatches colors={SEAL_COLORS} value={sealColor} onChange={setSealColor} />
                        <div className="flex gap-1">{SEAL_SYMBOLS.map((s) => <button key={s} onClick={() => setSealSymbol(s)} className={`grid h-8 w-8 place-items-center rounded-full ${sealSymbol === s ? "bg-ink text-cream" : "bg-ink/5"}`}>{s}</button>)}</div>
                      </div>
                    </div>
                  </Field>
                  <Field label="signature"><SignaturePad onChange={setSig} ink={d.ink_color} /></Field>
                  <Field label="from">
                    <input maxLength={60} value={d.from_name} onChange={(e) => set({ from_name: e.target.value })} placeholder="anonymous" className="w-full rounded-md border border-ink/20 bg-card px-3 py-2 font-hand text-xl" />
                  </Field>
                  <Field label="open on (optional — stays locked until then)">
                    <input type="datetime-local" value={unlock} onChange={(e) => setUnlock(e.target.value)} className="rounded-md border border-ink/20 bg-card px-3 py-2" />
                  </Field>
                </>
              )}
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-ink/10 p-4">
              <button disabled={step === "style"} onClick={() => setStep(STEPS[STEPS.indexOf(step) - 1])} className="font-hand text-xl text-ink/70 disabled:opacity-30">← back</button>
              {step !== "seal" ? (
                <button onClick={() => setStep(STEPS[STEPS.indexOf(step) + 1])} className="rotate-1 bg-butter px-5 py-2 font-hand text-2xl text-ink shadow-item">next →</button>
              ) : (
                <button disabled={busy} onClick={submit} className="-rotate-1 bg-cherry px-5 py-2 font-hand text-2xl text-primary-foreground shadow-item disabled:opacity-60">{busy ? "pinning…" : "📌 pin it to the board"}</button>
              )}
            </footer>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-2 font-typewriter text-xs uppercase tracking-wider text-ink/60">{label}</div>{children}</div>;
}

function Swatches({ colors, value, onChange }: { colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2">
      {colors.map((c) => (
        <button key={c} onClick={() => onChange(c)} aria-label={c} className={`h-8 w-8 rounded-full shadow-sm transition ${value === c ? "scale-110 ring-2 ring-ink ring-offset-2" : ""}`} style={{ background: c }} />
      ))}
    </div>
  );
}

function SignaturePad({ onChange, ink }: { onChange: (url: string | null) => void; ink: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * ref.current!.width, ((e.clientY - r.top) / r.height) * ref.current!.height];
  };
  return (
    <div>
      <canvas
        ref={ref} width={600} height={180}
        className="w-full touch-none rounded-md border border-dashed border-ink/30 bg-card"
        onPointerDown={(e) => { drawing.current = true; const c = ref.current!.getContext("2d")!; const [x, y] = pos(e); c.beginPath(); c.moveTo(x, y); }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const c = ref.current!.getContext("2d")!; const [x, y] = pos(e);
          c.lineWidth = 4; c.lineCap = "round"; c.strokeStyle = ink; c.lineTo(x, y); c.stroke(); dirty.current = true;
        }}
        onPointerUp={() => { drawing.current = false; if (dirty.current) onChange(ref.current!.toDataURL("image/png")); }}
        onPointerLeave={() => { if (drawing.current && dirty.current) onChange(ref.current!.toDataURL("image/png")); drawing.current = false; }}
      />
      <button onClick={() => { ref.current!.getContext("2d")!.clearRect(0, 0, 600, 180); dirty.current = false; onChange(null); }} className="mt-1 text-xs underline">clear</button>
    </div>
  );
}

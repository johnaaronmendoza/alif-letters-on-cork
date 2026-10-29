import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Check, ChevronLeft, CirclePlus, ChevronRight, Copy, Eye, EyeOff, ImageIcon, Layers, Link2, Maximize, Mic, Minus, Pencil,
  Plus, Redo2, Square, Trash2, Type, Undo2, Upload, Video, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { PIN_COLORS, getBrowserId, newBoardMeta, uploadMedia, type Letter } from "@/lib/letters";
import {
  BACKGROUNDS, CANVAS_FONTS, PAPERS, STICKER_PAGES, TEXT_BGS, TEXT_COLORS, backgroundCss, heightFor, parseVideo,
  plainText, safeUrl, stickerLabel, stickerShape, stickerSrc, uid, type CanvasEl, type ElementKind, type PaperId, type StickerName,
} from "@/lib/canvas";
import { ease, fadeOut, spring } from "@/lib/motion";
import { LetterCanvas } from "./LetterCanvas";
import { Photocard } from "./Photocard";
import { PaperSwatch } from "./Paper";

type Dialog = null | { kind: "link" | "video" | "audio"; editId?: string };
/** A new element before it gets an id, stacking order and (optionally) a position. */
type NewEl = CanvasEl extends infer T ? (T extends CanvasEl ? Omit<T, "id" | "z" | "x" | "y" | "r"> & Partial<Pick<T, "x" | "y" | "r">> : never) : never;
const same = (a: CanvasEl[], b: CanvasEl[]) => a === b || JSON.stringify(a) === JSON.stringify(b);
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_AUDIO = 10 * 1024 * 1024;

export function LetterStudio({ letters, onClose, onPinned }: { letters: Letter[]; onClose: () => void; onPinned: (l: Letter) => void }) {
  const [from, setFrom] = useState("");
  const fromInput = useRef<HTMLInputElement>(null);
  const [nameNudge, setNameNudge] = useState(0); // bumps to shake the name field
  const askedName = useRef(false);
  const [els, setEls] = useState<CanvasEl[]>([]);
  const elsRef = useRef(els);
  elsRef.current = els;
  const past = useRef<CanvasEl[][]>([]);
  const future = useRef<CanvasEl[][]>([]);
  const before = useRef<CanvasEl[] | null>(null);
  const [, bump] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [bg, setBg] = useState<string>("peach");
  const [paper, setPaper] = useState<PaperId>("lined");
  const [photocard, setPhotocard] = useState(false);
  const [cardSrc, setCardSrc] = useState<string | null>(null);
  const cardInput = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [palette, setPalette] = useState<null | "color" | "bg" | "layers">(null);
  const [busy, setBusy] = useState(false);
  const files = useRef(new Map<string, Blob>());
  const imageInput = useRef<HTMLInputElement>(null);
  const photoTarget = useRef<string | null>(null);
  const colorInput = useRef<HTMLInputElement>(null);

  const sel = els.find((e) => e.id === selected) ?? null;

  // ── history ────────────────────────────────────────────────
  const commit = useCallback((next: CanvasEl[]) => {
    past.current.push(elsRef.current);
    future.current = [];
    setEls(next);
  }, []);
  const startGesture = () => { before.current = elsRef.current; };
  const endGesture = () => {
    if (before.current && !same(before.current, elsRef.current)) {
      past.current.push(before.current);
      future.current = [];
      bump((n) => n + 1);
    }
    before.current = null;
  };
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(elsRef.current);
    setEls(prev);
    setEditing(null);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(elsRef.current);
    setEls(next);
  };

  const edit = (id: string | null) => {
    if (id) { startGesture(); setSelected(id); setEditing(id); return; }
    // finishing a text edit: drop empty text boxes, record one history step
    const cur = elsRef.current.find((e) => e.id === editing);
    if (cur?.kind === "text" && !cur.text.trim()) setEls(elsRef.current.filter((e) => e.id !== cur.id));
    setEditing(null);
    endGesture();
  };

  const patch = (id: string, p: Partial<CanvasEl>) => commit(elsRef.current.map((e) => (e.id === id ? ({ ...e, ...p } as CanvasEl) : e)));
  const remove = (id: string) => { commit(elsRef.current.filter((e) => e.id !== id)); setSelected(null); setEditing(null); };
  const topZ = () => elsRef.current.reduce((m, e) => Math.max(m, e.z), 0) + 1;

  const add = (el: NewEl) => {
    const n = elsRef.current.length;
    const id = uid();
    const full = {
      x: 50 - el.w / 2 + ((n % 5) - 2) * 3,
      y: Math.max(4, 40 - el.h / 2 + ((n % 4) - 1.5) * 4),
      r: 0,
      ...el,
      id,
      z: topZ(),
    } as CanvasEl;
    commit([...elsRef.current, full]);
    setSelected(id);
    setPalette(null);
    return id;
  };

  // ── keyboard ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); (e.shiftKey ? redo : undo)(); return; }
      if (e.key === "Escape") {
        if (dialog) setDialog(null);
        else if (editing) edit(null);
        else if (selected) setSelected(null);
        else requestClose();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected && !typing) { e.preventDefault(); remove(selected); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const requestClose = () => {
    if (elsRef.current.length && !confirm("leave without pinning? your letter will be lost")) return;
    onClose();
  };

  // ── adding things ──────────────────────────────────────────
  const addText = () => {
    const id = add({ kind: "text", text: "", font: "caveat", color: "#2B2B2B", bg: null, size: 5.5, w: 56, h: 9 });
    setTimeout(() => edit(id), 0);
  };

  const pickImage = (file: File) => {
    if (file.size > MAX_IMAGE) { toast.error("images must be under 8MB"); return; }
    const url = URL.createObjectURL(file);
    const target = photoTarget.current;
    photoTarget.current = null;
    if (target) {
      const t = elsRef.current.find((e) => e.id === target);
      files.current.set(`${target}:${t?.kind === "sticker" ? "photo" : "src"}`, file);
      patch(target, (t?.kind === "sticker" ? { photo: url } : { src: url }) as Partial<CanvasEl>);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalHeight / img.naturalWidth || 1;
      const w = aspect > 1.3 ? 32 : 42;
      const id = add({ kind: "image", src: url, w, h: heightFor(w, aspect), r: Math.round(Math.random() * 6 - 3) });
      files.current.set(`${id}:src`, file);
    };
    img.src = url;
  };

  const addSticker = (name: StickerName) => {
    const s = stickerShape(name);
    add({ kind: "sticker", name, w: s.w, h: heightFor(s.w, s.aspect), r: Math.round(Math.random() * 8 - 4) });
  };

  const choosePhotoFor = (id: string) => { photoTarget.current = id; imageInput.current?.click(); };

  const duplicate = (el: CanvasEl) => {
    const id = uid();
    commit([...elsRef.current, { ...el, id, x: el.x + 4, y: el.y + 4, z: topZ() }]);
    const srcKey = files.current.get(`${el.id}:src`), photoKey = files.current.get(`${el.id}:photo`);
    if (srcKey) files.current.set(`${id}:src`, srcKey);
    if (photoKey) files.current.set(`${id}:photo`, photoKey);
    setSelected(id);
  };

  // ── publish ────────────────────────────────────────────────
  const publish = async () => {
    if (!els.length && !(photocard && cardSrc)) { toast.error("add something to your letter first ♡"); return; }
    // the first time someone pins without a name, point them to it once; a second tap sends it anonymously
    if (!from.trim() && !askedName.current) {
      askedName.current = true;
      setNameNudge((n) => n + 1);
      fromInput.current?.focus();
      toast("add your name so Alif knows who it's from — or tap PIN IT again to stay anonymous");
      return;
    }
    setBusy(true);
    setSelected(null);
    try {
      const stored: CanvasEl[] = [];
      for (const el of els) {
        const copy = { ...el } as CanvasEl & { src?: string; photo?: string | null };
        for (const field of ["src", "photo"] as const) {
          const v = copy[field];
          if (typeof v === "string" && v.startsWith("blob:")) {
            const blob = files.current.get(`${el.id}:${field}`);
            if (!blob) { delete copy[field]; continue; }
            const ext = (blob.type.split("/")[1] ?? "bin").replace("mpeg", "mp3").replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
            copy[field] = await uploadMedia("photos", blob, ext);
          }
        }
        stored.push(copy);
      }
      const cardBlob = photocard && cardSrc ? files.current.get("photocard") : undefined;
      const cover = cardBlob
        ? await uploadMedia("photos", cardBlob, (cardBlob.type.split("/")[1] ?? "jpg").replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg")
        : null;
      const spot = newBoardMeta();
      const { data, error } = await supabase.from("letters").insert({
        from_name: from.trim().slice(0, 60) || "anonymous",
        open_when_label: "",
        body: plainText(stored),
        paper_style: bg,
        font: "caveat",
        ink_color: "#2B2B2B",
        stickers: JSON.parse(JSON.stringify([{ kind: "meta", photocard: !!cover, paper }, ...stored])) as Json,
        photo_url: cover,
        signature_url: null,
        pin_color: PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)]!,
        unlock_at: null,
        browser_id: getBrowserId(),
        ...spot,
      }).select("*").single();
      if (error) throw error;
      onPinned(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      toast.error(msg.includes("rate_limited")
        ? "you've pinned 5 letters this hour — take a breather and come back soon ♡"
        : /storage|bucket|upload|object/i.test(msg) ? "couldn't upload your photos or audio — try again?" : "couldn't pin that one, try again?");
    } finally { setBusy(false); }
  };

  const canUndo = past.current.length > 0, canRedo = future.current.length > 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex bg-ink/50 backdrop-blur-sm sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.25, ease: ease.out } }} exit={{ opacity: 0, transition: fadeOut }}
      role="dialog" aria-modal="true" aria-label="write a letter"
    >
      <motion.div
        style={{ transformOrigin: "100% 100%" }}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { ...spring.soft, opacity: { duration: 0.2 } } }}
        exit={{ opacity: 0, y: 24, scale: 0.97, transition: fadeOut }}
        className="flex h-full w-full flex-col overflow-hidden bg-[#f4f2ef] font-clean text-ink shadow-paper sm:rounded-xl"
      >
        {/* top bar */}
        <header className="flex items-center gap-2 border-b border-black/10 px-3 py-2 sm:px-5 sm:py-3">
          <IconBtn label="back" onClick={requestClose}><ArrowLeft className="h-5 w-5" /></IconBtn>
          <div className="min-w-0 flex-1">
            {/* name tag: who the letter is from */}
            <motion.label
              key={nameNudge}
              animate={nameNudge ? { x: [0, -8, 7, -5, 3, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={`group relative flex w-full max-w-sm min-h-11 cursor-text items-center gap-2 rounded-xl border-2 px-3 transition-colors duration-200 focus-within:border-[#4a4541] focus-within:bg-white ${from.trim() ? "border-transparent bg-[#f6e7a6]/60" : "border-dashed border-[#d9b84a] bg-[#f6e7a6]"}`}
            >
              {!from.trim() && (
                // soft pulse while empty, so it's hard to miss
                <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-[#e6c84f]"
                  animate={{ opacity: [0, 0.9, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
              )}
              <Pencil className="h-4 w-4 shrink-0 text-ink/60" aria-hidden />
              <span className="shrink-0 font-typewriter text-sm uppercase tracking-[0.12em] text-ink/70">from</span>
              <input
                ref={fromInput}
                value={from} onChange={(e) => setFrom(e.target.value)} maxLength={60}
                placeholder="your name"
                aria-label="who is this letter from? your name"
                className="min-w-0 flex-1 bg-transparent font-hand text-xl text-ink outline-none placeholder:text-ink/40 sm:text-2xl"
              />
            </motion.label>
          </div>
          <IconBtn label="undo" onClick={undo} disabled={!canUndo}><Undo2 className="h-5 w-5" /></IconBtn>
          <IconBtn label="redo" onClick={redo} disabled={!canRedo}><Redo2 className="h-5 w-5" /></IconBtn>
          <IconBtn label="clear the letter" className="hidden sm:grid" disabled={!els.length} onClick={() => { if (confirm("clear everything on this letter?")) { commit([]); setSelected(null); } }}><Trash2 className="h-5 w-5" /></IconBtn>
          <IconBtn label={preview ? "back to editing" : "preview"} onClick={() => { setPreview(!preview); setSelected(null); setEditing(null); }}>
            {preview ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </IconBtn>
          <button
            onClick={publish} disabled={busy}
            className="ml-1 min-h-11 rounded-lg bg-[#4a4541] px-4 text-sm font-medium tracking-wider text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-wait disabled:opacity-60 sm:px-6"
          >
            {busy ? "PINNING…" : "PIN IT"}
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
          {/* sidebar */}
          {!preview && (
            <aside className="max-h-[42vh] shrink-0 overflow-y-auto border-t border-black/10 p-4 lg:max-h-none lg:w-[300px] lg:border-r lg:border-t-0 lg:p-6">
              <Section title="elements">
                <div className="grid grid-cols-2 gap-2.5">
                  <Tile icon={<Type className="h-5 w-5" />} label="text" onClick={addText} />
                  <Tile icon={<Link2 className="h-5 w-5" />} label="link" onClick={() => setDialog({ kind: "link" })} />
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                  <Tile icon={<ImageIcon className="h-5 w-5" />} label="image" onClick={() => { photoTarget.current = null; imageInput.current?.click(); }} />
                  <Tile icon={<Mic className="h-5 w-5" />} label="audio" onClick={() => setDialog({ kind: "audio" })} />
                  <Tile icon={<Video className="h-5 w-5" />} label="video" onClick={() => setDialog({ kind: "video" })} />
                </div>
              </Section>

              <Section
                title="stickers"
                action={
                  <div className="flex">
                    <IconBtn label="previous stickers" small disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></IconBtn>
                    <IconBtn label="next stickers" small disabled={page === STICKER_PAGES.length - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></IconBtn>
                  </div>
                }
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={page} className="grid grid-cols-3 gap-2"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10, transition: fadeOut }} transition={{ duration: 0.2, ease: ease.out }}>
                    {STICKER_PAGES[page]!.map((name) => (
                      <button key={name} onClick={() => addSticker(name)} aria-label={`add ${stickerLabel(name)} sticker`} title={stickerLabel(name)}
                        className="grid aspect-square place-items-center rounded-lg p-2 transition-transform duration-200 hover:scale-105 hover:bg-black/5 active:scale-95">
                        <img src={stickerSrc(name) ?? ""} alt="" draggable={false} loading="lazy" className="max-h-full max-w-full select-none object-contain" />
                      </button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </Section>

              <Section title="photocard" action={
                <button role="switch" aria-checked={photocard} aria-label="include a photocard" onClick={() => setPhotocard(!photocard)}
                  className={`grid h-7 w-7 place-items-center rounded-md border transition-colors duration-200 ${photocard ? "border-[#4a4541] bg-[#4a4541] text-white" : "border-black/20 bg-white"}`}>
                  {photocard && <Check className="h-4 w-4" />}
                </button>
              }>
                <AnimatePresence initial={false}>
                  {photocard && (
                    <motion.div key="drop" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0, transition: fadeOut }} transition={{ duration: 0.25, ease: ease.out }} className="overflow-hidden">
                      {cardSrc ? (
                        <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-2.5">
                          <img src={cardSrc} alt="photocard" className="h-16 w-14 rounded object-cover shadow-sm" />
                          <div className="flex flex-1 flex-col items-start gap-1 text-sm">
                            <button className="min-h-9 underline-offset-2 hover:underline" onClick={() => cardInput.current?.click()}>replace</button>
                            <button className="min-h-9 text-ink/50 underline-offset-2 hover:underline" onClick={() => { setCardSrc(null); files.current.delete("photocard"); }}>remove</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => cardInput.current?.click()}
                          className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 text-ink/50 transition-colors duration-200 hover:border-black/30 hover:bg-white/60 hover:text-ink/70">
                          <CirclePlus className="h-7 w-7" strokeWidth={1.5} />
                          <span className="font-typewriter text-sm uppercase tracking-[0.12em]">add image</span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                {!photocard && <p className="-mt-1 text-xs text-ink/50">tuck a printed photo in with your letter</p>}
              </Section>

              <Section title="paper">
                <div className="grid grid-cols-5 gap-2.5">
                  {PAPERS.map((p) => (
                    <button key={p.id} onClick={() => setPaper(p.id)} aria-label={`${p.label} paper`} aria-pressed={paper === p.id} title={p.label}
                      className={`rounded-md p-1 transition-transform duration-200 hover:-translate-y-0.5 ${paper === p.id ? "bg-white ring-2 ring-ink" : "hover:bg-black/5"}`}>
                      <PaperSwatch paper={p.id} />
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="background">
                <div className="grid grid-cols-5 gap-2.5">
                  {BACKGROUNDS.map((b) => (
                    <button key={b.id} onClick={() => setBg(b.id)} aria-label={`${b.label} background`} aria-pressed={bg === b.id}
                      className={`aspect-square rounded-full shadow-sm transition-transform duration-200 hover:scale-105 ${bg === b.id ? "ring-2 ring-ink ring-offset-2 ring-offset-[#f4f2ef]" : ""}`}
                      style={{ background: b.css }} />
                  ))}
                  <button onClick={() => colorInput.current?.click()} aria-label="custom background color"
                    className={`grid aspect-square place-items-center rounded-full border border-dashed border-black/30 text-ink/50 transition-transform duration-200 hover:scale-105 ${bg.startsWith("#") ? "ring-2 ring-ink ring-offset-2 ring-offset-[#f4f2ef]" : ""}`}
                    style={bg.startsWith("#") ? { background: bg } : undefined}>
                    {!bg.startsWith("#") && <Plus className="h-4 w-4" />}
                  </button>
                  <input ref={colorInput} type="color" className="sr-only" tabIndex={-1} onChange={(e) => setBg(e.target.value)} />
                </div>
              </Section>
            </aside>
          )}

          {/* canvas */}
          <div className="relative min-h-[45vh] flex-1" style={{ background: backgroundCss(bg) }}>
            {sel && !preview && (
              <Toolbar
                el={sel}
                palette={palette}
                setPalette={setPalette}
                onPatch={(p) => patch(sel.id, p)}
                onEdit={() => {
                  if (sel.kind === "text") edit(sel.id);
                  else if (sel.kind === "link" || sel.kind === "video") setDialog({ kind: sel.kind, editId: sel.id });
                  else if (sel.kind === "audio") setDialog({ kind: "audio", editId: sel.id });
                  else choosePhotoFor(sel.id);
                }}
                onFront={() => patch(sel.id, { z: topZ() })}
                onBack={() => patch(sel.id, { z: elsRef.current.reduce((m, e) => Math.min(m, e.z), 0) - 1 })}
                onDuplicate={() => duplicate(sel)}
                onDelete={() => remove(sel.id)}
              />
            )}
            <div className="absolute inset-0 overflow-auto" onPointerDown={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.backdrop) { setSelected(null); if (editing) edit(null); } }}>
            <div data-backdrop="1" className="flex min-h-full items-start justify-center px-6 pb-20 pt-16 sm:items-center">
              <div style={{ width: `calc(min(560px, 88%, (100svh - 17rem) * 0.75) * ${zoom})` }} className="transition-[width] duration-200">
                <div className="relative">
                <LetterCanvas
                  elements={els}
                  paper={paper}
                  mode={preview ? "view" : "edit"}
                  selectedId={selected}
                  editingId={editing}
                  onSelect={(id) => { setSelected(id); setPalette(null); }}
                  onEdit={edit}
                  onChange={setEls}
                  onGestureStart={startGesture}
                  onGestureEnd={endGesture}
                />
                <AnimatePresence>
                  {photocard && (
                    <motion.button
                      key="card"
                      type="button"
                      aria-label={cardSrc ? "replace photocard image" : "add photocard image"}
                      onClick={() => !preview && cardInput.current?.click()}
                      onPointerDown={(e) => e.stopPropagation()}
                      initial={{ opacity: 0, x: 40, rotate: 14 }}
                      animate={{ opacity: 1, x: 0, rotate: 6 }}
                      exit={{ opacity: 0, x: 30, rotate: 12, transition: fadeOut }}
                      whileHover={preview ? undefined : { rotate: 3, y: -4, transition: spring.soft }}
                      transition={spring.soft}
                      className="absolute -right-[16%] top-[48%] z-20 w-[40%] cursor-pointer"
                    >
                      <Photocard src={cardSrc} prompt={!preview} />
                    </motion.button>
                  )}
                </AnimatePresence>
                </div>
                {!els.length && !preview && (
                  <p className="mt-4 text-center text-sm text-ink/60">start with text, a photo or a sticker from the left ♡</p>
                )}
              </div>
            </div>
            </div>
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-2xl bg-white/90 p-1.5 shadow-lg backdrop-blur">
              <IconBtn label="zoom out" small disabled={zoom <= 0.6} onClick={() => setZoom(Math.max(0.6, +(zoom - 0.2).toFixed(1)))}><Minus className="h-4 w-4" /></IconBtn>
              <span className="w-10 text-center text-xs tabular-nums text-ink/60">{Math.round(zoom * 100)}%</span>
              <IconBtn label="zoom in" small disabled={zoom >= 1.6} onClick={() => setZoom(Math.min(1.6, +(zoom + 0.2).toFixed(1)))}><Plus className="h-4 w-4" /></IconBtn>
              <IconBtn label="fit to screen" small onClick={() => setZoom(1)}><Maximize className="h-4 w-4" /></IconBtn>
            </div>
          </div>
        </div>

        <input ref={cardInput} type="file" accept="image/*" className="sr-only" tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > MAX_IMAGE) { toast.error("images must be under 8MB"); return; }
            files.current.set("photocard", f);
            setCardSrc(URL.createObjectURL(f));
          }} />
        <input ref={imageInput} type="file" accept="image/*" className="sr-only" tabIndex={-1}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickImage(f); }} />

        <AnimatePresence>
          {dialog && (
            <AddDialog
              key="dialog"
              dialog={dialog}
              current={dialog.editId ? els.find((e) => e.id === dialog.editId) : undefined}
              onClose={() => setDialog(null)}
              onLink={(url, label) => {
                if (dialog.editId) patch(dialog.editId, { url, label } as Partial<CanvasEl>);
                else add({ kind: "link", url, label, w: 30, h: heightFor(30, 0.24) });
                setDialog(null);
              }}
              onVideo={(url) => {
                if (dialog.editId) patch(dialog.editId, { url } as Partial<CanvasEl>);
                else add({ kind: "video", url, w: 60, h: heightFor(60, 9 / 16) });
                setDialog(null);
              }}
              onAudio={(blob, name) => {
                const url = URL.createObjectURL(blob);
                if (dialog.editId) { files.current.set(`${dialog.editId}:src`, blob); patch(dialog.editId, { src: url, name } as Partial<CanvasEl>); }
                else { const id = add({ kind: "audio", src: url, name, w: 50, h: heightFor(50, 0.2) }); files.current.set(`${id}:src`, blob); }
                setDialog(null);
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ── pieces ─────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <div className="mb-3 flex min-h-8 items-center justify-between">
        <h3 className="font-typewriter text-sm uppercase tracking-[0.12em] text-ink/70">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Tile({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-black/10 bg-[#f7f5f2] text-ink/70 transition duration-200 hover:-translate-y-0.5 hover:border-black/20 hover:bg-white hover:text-ink active:translate-y-0 active:scale-[0.98]">
      {icon}
      <span className="font-typewriter text-xs uppercase tracking-[0.12em]">{label}</span>
    </button>
  );
}

function IconBtn({ label, onClick, disabled, small, className = "", children }: {
  label: string; onClick: () => void; disabled?: boolean; small?: boolean; className?: string; children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={`grid shrink-0 place-items-center rounded-lg text-ink/70 transition-colors duration-200 hover:bg-black/5 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent ${small ? "h-9 w-9" : "h-11 w-11"} ${className}`}>
      {children}
    </button>
  );
}

function Toolbar({ el, palette, setPalette, onPatch, onEdit, onFront, onBack, onDuplicate, onDelete }: {
  el: CanvasEl;
  palette: null | "color" | "bg" | "layers";
  setPalette: (p: null | "color" | "bg" | "layers") => void;
  onPatch: (p: Partial<CanvasEl>) => void;
  onEdit: () => void; onFront: () => void; onBack: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const isText = el.kind === "text";
  const nextFont = () => {
    if (!isText) return;
    const i = CANVAS_FONTS.findIndex((f) => f.id === el.font);
    onPatch({ font: CANVAS_FONTS[(i + 1) % CANVAS_FONTS.length]!.id } as Partial<CanvasEl>);
  };
  const editLabel = isText ? "edit text" : el.kind === "sticker" ? "add photo" : el.kind === "image" ? "replace image" : `edit ${el.kind}`;
  const canEdit = el.kind !== "sticker" || !!stickerShape(el.name).frame;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3">
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={spring.snappy}
      className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-2xl border border-black/5 bg-white p-1.5 shadow-lg"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {isText && (
        <>
          <IconBtn label={`font: ${CANVAS_FONTS.find((f) => f.id === el.font)?.label}`} onClick={nextFont}><Type className="h-5 w-5" /></IconBtn>
          <Swatch label="highlight" color={el.bg} open={palette === "bg"} onToggle={() => setPalette(palette === "bg" ? null : "bg")}>
            {TEXT_BGS.map((c) => (
              <ColorDot key={String(c)} color={c} active={el.bg === c} onClick={() => { onPatch({ bg: c } as Partial<CanvasEl>); setPalette(null); }} />
            ))}
          </Swatch>
          <IconBtn label={el.bg ? "remove highlight" : "add highlight"} onClick={() => onPatch({ bg: el.bg ? null : "#FFFFFF" } as Partial<CanvasEl>)}><Square className="h-5 w-5" /></IconBtn>
          <Swatch label="text color" color={el.color} open={palette === "color"} onToggle={() => setPalette(palette === "color" ? null : "color")}>
            {TEXT_COLORS.map((c) => (
              <ColorDot key={c} color={c} active={el.color === c} onClick={() => { onPatch({ color: c } as Partial<CanvasEl>); setPalette(null); }} />
            ))}
          </Swatch>
        </>
      )}
      {canEdit && (
        <IconBtn label={editLabel} onClick={onEdit}>
          {el.kind === "sticker" ? <ImageIcon className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
        </IconBtn>
      )}
      <div className="relative">
        <IconBtn label="layers" onClick={() => setPalette(palette === "layers" ? null : "layers")}><Layers className="h-5 w-5" /></IconBtn>
        {palette === "layers" && (
          <div className="absolute left-1/2 top-full z-10 mt-2 w-40 -translate-x-1/2 overflow-hidden rounded-xl border border-black/5 bg-white py-1 text-sm shadow-lg">
            <button className="block min-h-11 w-full px-4 text-left hover:bg-black/5" onClick={() => { onFront(); setPalette(null); }}>bring to front</button>
            <button className="block min-h-11 w-full px-4 text-left hover:bg-black/5" onClick={() => { onBack(); setPalette(null); }}>send to back</button>
          </div>
        )}
      </div>
      <IconBtn label="duplicate" onClick={onDuplicate}><Copy className="h-5 w-5" /></IconBtn>
      <IconBtn label="delete" onClick={onDelete}><Trash2 className="h-5 w-5" /></IconBtn>
    </motion.div>
    </div>
  );
}

function Swatch({ label, color, open, onToggle, children }: { label: string; color: string | null; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="relative">
      <button type="button" aria-label={label} title={label} aria-expanded={open} onClick={onToggle} className="grid h-11 w-11 place-items-center rounded-lg hover:bg-black/5">
        <span className="h-8 w-8 rounded-lg border border-black/15" style={{ background: color ?? "repeating-linear-gradient(45deg,#fff 0 4px,#eee 4px 8px)" }} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-10 mt-2 flex -translate-x-1/2 gap-1.5 rounded-xl border border-black/5 bg-white p-2 shadow-lg">{children}</div>
      )}
    </div>
  );
}

function ColorDot({ color, active, onClick }: { color: string | null; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={color ? `color ${color}` : "none"} aria-pressed={active}
      className={`h-9 w-9 shrink-0 rounded-full border border-black/15 transition-transform duration-150 hover:scale-110 ${active ? "ring-2 ring-ink ring-offset-2" : ""}`}
      style={{ background: color ?? "repeating-linear-gradient(45deg,#fff 0 4px,#ddd 4px 8px)" }} />
  );
}

function AddDialog({ dialog, current, onClose, onLink, onVideo, onAudio }: {
  dialog: NonNullable<Dialog>;
  current?: CanvasEl;
  onClose: () => void;
  onLink: (url: string, label: string) => void;
  onVideo: (url: string) => void;
  onAudio: (blob: Blob, name: string) => void;
}) {
  const kind: ElementKind = dialog.kind;
  const [url, setUrl] = useState(current && "url" in current ? current.url : "");
  const [label, setLabel] = useState(current?.kind === "link" ? current.label : "");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const audioFile = useRef<HTMLInputElement>(null);

  useEffect(() => () => { rec.current?.stream.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => {
      if (s + 1 >= 180) rec.current?.stop();
      return s + 1;
    }), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const submitUrl = () => {
    const clean = safeUrl(url);
    if (!clean) { toast.error("that link doesn't look right"); return; }
    if (kind === "video") {
      if (!parseVideo(clean)) toast("this link won't play inside the letter — it'll show as a tile that opens the video");
      onVideo(clean);
    } else onLink(clean, label.trim().slice(0, 40));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        if (blob.size) onAudio(blob, "voice note");
      };
      rec.current = r;
      r.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      toast.error("couldn't use your microphone — check the browser permission");
    }
  };

  const title = kind === "link" ? "add a link" : kind === "video" ? "add a video link" : "add audio";

  return (
    <motion.div className="absolute inset-0 z-50 grid place-items-center bg-ink/40 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: fadeOut }} onClick={onClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1, transition: spring.soft }} exit={{ opacity: 0, y: 8, transition: fadeOut }}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-paper"
        role="dialog" aria-modal="true" aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-typewriter text-sm uppercase tracking-[0.12em]">{title}</h2>
          <IconBtn label="close" small onClick={onClose}><X className="h-4 w-4" /></IconBtn>
        </div>

        {kind === "audio" ? (
          <div className="grid gap-2.5">
            <button onClick={() => audioFile.current?.click()} disabled={recording}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-black/10 px-4 text-sm transition-colors hover:bg-black/5 disabled:opacity-40">
              <Upload className="h-4 w-4" /> upload an audio file
            </button>
            <button onClick={() => (recording ? rec.current?.stop() : void startRecording())}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm transition-colors ${recording ? "bg-cherry text-white" : "border border-black/10 hover:bg-black/5"}`}>
              <Mic className="h-4 w-4" />
              {recording ? `recording ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} — tap to stop` : "record a voice note"}
            </button>
            <p className="text-xs text-ink/50">up to 10MB, voice notes up to 3 minutes</p>
            <input ref={audioFile} type="file" accept="audio/*" className="sr-only" tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (f.size > MAX_AUDIO) { toast.error("audio must be under 10MB"); return; }
                onAudio(f, f.name.replace(/\.[^.]+$/, "").slice(0, 40));
              }} />
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); submitUrl(); }}>
            <label className="grid gap-1.5 text-sm">
              <span className="text-ink/60">{kind === "video" ? "youtube, vimeo or video file link" : "link"}</span>
              <input autoFocus inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://"
                className="min-h-11 rounded-lg border border-black/15 px-3 outline-none focus:border-ink" />
            </label>
            {kind === "link" && (
              <label className="grid gap-1.5 text-sm">
                <span className="text-ink/60">label (optional)</span>
                <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="our playlist"
                  className="min-h-11 rounded-lg border border-black/15 px-3 outline-none focus:border-ink" />
              </label>
            )}
            <button type="submit" className="mt-1 min-h-11 rounded-lg bg-[#4a4541] text-sm font-medium tracking-wider text-white transition-transform active:scale-95">
              {current ? "SAVE" : "ADD"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

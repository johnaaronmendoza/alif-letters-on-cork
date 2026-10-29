import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useAnimate } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ART_ASPECT, envelopeFor, layoutBoard, playStamp, playThunk, type Letter } from "@/lib/letters";
import { spring } from "@/lib/motion";
import { BoardFigures } from "@/components/letters/Figures";
import { BoardItem } from "@/components/letters/BoardItem";
import { BoardIntro } from "@/components/letters/BoardIntro";

// The editor and the opener are only needed after a tap, so they load on demand
// (and are prefetched on hover / once the intro is done).
/** Retry once, then reload: after a new deploy, an open tab may ask for a chunk that no longer exists. */
function chunk<T>(load: () => Promise<T>) {
  return () => load().catch(() => load()).catch((err) => {
    let reloaded = false;
    try { reloaded = sessionStorage.getItem("alif-chunk-reload") === "1"; sessionStorage.setItem("alif-chunk-reload", "1"); } catch { /* storage blocked */ }
    if (!reloaded) window.location.reload();
    throw err;
  });
}
const loadOpen = chunk(() => import("@/components/letters/LetterOpen"));
const loadStudio = chunk(() => import("@/components/letters/LetterStudio"));
const LetterOpen = lazy(() => loadOpen().then((m) => ({ default: m.LetterOpen })));
const LetterStudio = lazy(() => loadStudio().then((m) => ({ default: m.LetterStudio })));

/** Warm up everything opening this letter needs: the opener code and its envelope layers. */
const warmed = new Set<string>();
function prefetchOpen(envelope: string) {
  void loadOpen();
  for (const src of ["/board/seal.webp", ...["pocket", "flap", "pin"].map((p) => `/board/envelopes/open/${envelope}-${p}.webp`)]) {
    if (warmed.has(src)) continue;
    warmed.add(src);
    const img = new Image();
    img.src = src;
  }
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alif's Byebye — leave him a letter" },
      { name: "description", content: "Alif's farewell corkboard. Write him a letter, decorate it, and pin it to the board." },
      { property: "og:title", content: "Alif's Byebye" },
      { property: "og:description", content: "Write Alif a goodbye letter and pin it to his corkboard." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og.jpg" },
    ],
    links: [
      // the intro's first frame: fetched before the (hidden-for-now) collage
      { rel: "preload", as: "image", href: "/board/intro/empty.webp", fetchPriority: "high" },
    ],
  }),
  component: Room,
});

function Room() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [newIds, setNewIds] = useState(() => new Set<string>());
  const [open, setOpen] = useState<{ letter: Letter; rect: DOMRect } | null>(null);
  const [studio, setStudio] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const knownIds = useRef(new Set<string>());
  // intro plays on every load; on by default so the full collage never flashes first
  const [intro, setIntro] = useState(true);
  const [board, animateBoard] = useAnimate();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setIntro(false);
    try { sessionStorage.removeItem("alif-chunk-reload"); } catch { /* storage blocked */ }
  }, []);
  const stamp = () => {
    if (board.current) void animateBoard(board.current, { x: [0, -12, 10, -7, 4, -2, 0], y: [0, 6, -4, 3, -1, 0] }, { duration: 0.45, ease: "easeOut" });
    if (!mutedRef.current) playStamp();
  };
  const introDone = () => setIntro(false);
  useEffect(() => {
    if (intro) return;
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const t = idle ? idle(() => void loadStudio()) : window.setTimeout(() => void loadStudio(), 1500);
    return () => { if (!idle) clearTimeout(t); };
  }, [intro]);

  useEffect(() => {
    setMuted(localStorage.getItem("alif-muted") === "1");
    supabase.from("letters").select("*").order("created_at").then(({ data }) => {
      if (!data) return;
      data.forEach((l) => knownIds.current.add(l.id));
      setLetters(data);
    });
    const ch = supabase
      .channel(`letters-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "letters" }, (p) => addLetter(p.new as Letter))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "letters" }, (p) => {
        const id = (p.old as Letter).id;
        knownIds.current.delete(id);
        setLetters((ls) => ls.filter((l) => l.id !== id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  function addLetter(l: Letter) {
    if (knownIds.current.has(l.id)) return;
    knownIds.current.add(l.id);
    setNewIds((s) => new Set(s).add(l.id));
    setLetters((ls) => (ls.some((x) => x.id === l.id) ? ls : [...ls, l]));
    setTimeout(() => !mutedRef.current && playThunk(), 380);
  }

  const onPinned = (l: Letter) => {
    setStudio(false);
    addLetter(l);
    setTimeout(() => document.getElementById(`letter-${l.id}`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }), 100);
  };

  const { spots, height } = layoutBoard(letters);
  const extended = height > 100;

  return (
    <MotionConfig reducedMotion="user">
    <main className="wall relative min-h-screen overflow-x-hidden pb-28">
      {/* the collage carries the title; keep a heading for screen readers */}
      <h1 className="sr-only">Letters for Alif — {letters.length} {letters.length === 1 ? "letter" : "letters"} pinned</h1>
      <button onClick={() => { setMuted(!muted); localStorage.setItem("alif-muted", muted ? "0" : "1"); }} aria-label={muted ? "unmute" : "mute"} className="fixed bottom-5 left-5 z-40 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-card/80 text-ink shadow-item transition-transform duration-200 hover:scale-105 active:scale-95">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <section className="relative mx-auto w-full pt-16 md:pt-[clamp(5rem,11vh,8rem)]">
        {/* phones: the board keeps a readable width and scrolls sideways.
            md+: it is sized so the whole board, plus room for the figures above
            and the write button below, fits in the window. */}
        <div className="overflow-x-auto px-4 pb-4 md:overflow-visible md:px-0 md:pb-0">
          <div
            className="relative mx-auto w-[900px] max-w-none md:w-[min(76vw,calc((100svh-15rem)*1.78))] md:min-w-[600px]"
            style={{ containerType: "inline-size" }}
          >
            {/* figures sit on the board's corners, positioned relative to the board itself */}
            {!intro && <BoardFigures muted={muted} />}
            <div ref={board} className="frame rounded-md p-[2.2%]">
              <div className="cork-photo relative w-full overflow-hidden rounded-sm" style={{ aspectRatio: `${ART_ASPECT} / ${height / 100}` }}>
                {/* Alif's collage is the board; letters pin into the open cork around it,
                    and the cork carries on below once those spots are full. */}
                <img
                  src="/board/base-1600.webp"
                  srcSet="/board/base-1600.webp 1600w, /board/base.webp 2400w"
                  sizes="(min-width: 768px) min(76vw, 1600px), 900px"
                  alt="Alif's byebye collage: photos of Alif, a photo booth strip, a pig keychain, rock and Arsenal stickers"
                  width={2400}
                  height={1295}
                  fetchPriority={intro ? "low" : "high"}
                  draggable={false}
                  className="pointer-events-none absolute left-0 top-0 block h-auto w-full select-none"
                  style={extended ? { maskImage: "linear-gradient(to bottom, #000 95%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 95%, transparent)" } : undefined}
                />
                {intro && <BoardIntro onStamp={stamp} onDone={introDone} />}
                {!intro && letters.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: -4 }} transition={{ delay: 0.6, ...spring.soft }}
                    className="absolute left-[3%] top-[5%] z-10 w-[18%] min-w-[120px] bg-[#f8f4ea] px-[1.2%] py-[1%] text-center font-typewriter text-[clamp(10px,1vw,14px)] leading-snug text-ink shadow-[0_2px_4px_rgb(0_0_0/.2),0_8px_14px_-6px_rgb(0_0_0/.3)]"
                  >
                    <span className="absolute -top-[0.6em] left-1/2 h-[1.2em] w-[45%] -translate-x-1/2 rotate-2 bg-tape/80" />
                    no letters yet —<br />be the first to pin one ✉
                  </motion.div>
                )}
                {!intro && letters.map((l, i) => {
                  const spot = spots.get(l.id);
                  return spot ? (
                    <BoardItem key={l.id} letter={l} spot={spot} boardHeight={height} index={i} isNew={newIds.has(l.id)} onPrefetch={() => prefetchOpen(envelopeFor(l.id).name)} onOpen={(rect) => setOpen({ letter: l, rect })} />
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-1 text-center font-clean text-xs text-ink/70 md:hidden">swipe sideways to see the whole board ↔</p>
      </section>

      {!intro && (
      <motion.button
        onClick={() => setStudio(true)}
        onPointerEnter={() => void loadStudio()}
        onFocus={() => void loadStudio()}
        className="paper-tag fixed bottom-5 right-5 z-40 min-h-11 cursor-pointer px-5 py-3 pl-8 font-hand text-2xl text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        initial={{ y: 90, opacity: 0, rotate: -4 }}
        animate={{ y: 0, opacity: 1, rotate: [-4, -4, -9, 1, -6, -4] }}
        transition={{
          y: { ...spring.soft, delay: 0.6 },
          opacity: { duration: 0.2, delay: 0.6 },
          // a small "pick me" nudge, three times, then it rests
          rotate: { duration: 0.9, times: [0, 0.4, 0.55, 0.7, 0.85, 1], delay: 2.4, repeat: 2, repeatDelay: 6, ease: "easeInOut" },
        }}
        whileHover={{ scale: 1.05, rotate: -1, transition: spring.soft }}
        whileTap={{ scale: 0.96, transition: spring.snappy }}
      >
        ✉ write alif a letter
      </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <Suspense key="open" fallback={<Opening />}>
            <LetterOpen letter={open.letter} origin={open.rect} onClose={() => setOpen(null)} />
          </Suspense>
        )}
        {studio && (
          <Suspense key="studio" fallback={<Opening />}>
            <LetterStudio letters={letters} onClose={() => setStudio(false)} onPinned={onPinned} />
          </Suspense>
        )}
      </AnimatePresence>
    </main>
    </MotionConfig>
  );
}

/** Shown for the moment the opener or the editor takes to load the first time. */
function Opening() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1c140e]/40 backdrop-blur-sm" role="status" aria-live="polite">
      <span className="flex items-center gap-3 rounded-full bg-white/90 px-5 py-2.5 font-clean text-sm text-ink shadow-lg">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" aria-hidden />
        opening…
      </span>
    </div>
  );
}

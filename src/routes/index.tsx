import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useAnimate } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ART_ASPECT, layoutBoard, playStamp, playThunk, type Letter } from "@/lib/letters";
import { spring } from "@/lib/motion";
import { BoardFigures } from "@/components/letters/Figures";
import { BoardItem } from "@/components/letters/BoardItem";
import { LetterOpen } from "@/components/letters/LetterOpen";
import { LetterStudio } from "@/components/letters/LetterStudio";
import { BoardIntro } from "@/components/letters/BoardIntro";

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
  }, []);
  const stamp = () => {
    if (board.current) void animateBoard(board.current, { x: [0, -12, 10, -7, 4, -2, 0], y: [0, 6, -4, 3, -1, 0] }, { duration: 0.45, ease: "easeOut" });
    if (!mutedRef.current) playStamp();
  };
  const introDone = () => setIntro(false);

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
                  src="/board/base.webp"
                  alt="Alif's byebye collage: photos of Alif, a photo booth strip, a pig keychain, rock and Arsenal stickers"
                  width={2400}
                  height={1295}
                  fetchPriority="high"
                  draggable={false}
                  className="pointer-events-none absolute left-0 top-0 block h-auto w-full select-none"
                  style={extended ? { maskImage: "linear-gradient(to bottom, #000 95%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 95%, transparent)" } : undefined}
                />
                {intro && <BoardIntro onStamp={stamp} onDone={introDone} />}
                {!intro && letters.map((l, i) => {
                  const spot = spots.get(l.id);
                  return spot ? (
                    <BoardItem key={l.id} letter={l} spot={spot} boardHeight={height} index={i} isNew={newIds.has(l.id)} onOpen={(rect) => setOpen({ letter: l, rect })} />
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {!intro && (
      <motion.button
        onClick={() => setStudio(true)}
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
        {open && <LetterOpen key="open" letter={open.letter} origin={open.rect} onClose={() => setOpen(null)} />}
        {studio && <LetterStudio key="studio" letters={letters} onClose={() => setStudio(false)} onPinned={onPinned} />}
      </AnimatePresence>
    </main>
    </MotionConfig>
  );
}

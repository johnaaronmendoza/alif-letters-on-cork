import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ART_ASPECT, layoutBoard, playThunk, type Letter } from "@/lib/letters";
import { ease, spring } from "@/lib/motion";
import { FIGURES } from "@/lib/figures";
import { BoardItem } from "@/components/letters/BoardItem";
import { LetterOpen } from "@/components/letters/LetterOpen";
import { LetterStudio } from "@/components/letters/LetterStudio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "for alif ♡ — letters on the corkboard" },
      { name: "description", content: "A cozy scrapbook corkboard where friends pin letters for Alif. Write one, seal it, pin it." },
      { property: "og:title", content: "for alif ♡ — letters on the corkboard" },
      { property: "og:description", content: "Write Alif a letter and pin it to the shared corkboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
      <button onClick={() => { setMuted(!muted); localStorage.setItem("alif-muted", muted ? "0" : "1"); }} aria-label={muted ? "unmute" : "mute"} className="absolute right-4 top-4 z-20 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-card/80 text-ink shadow-item transition-transform duration-200 hover:scale-105 active:scale-95">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <section className="relative mx-auto mt-20 w-full md:mt-[max(6rem,9vw)]">
        {FIGURES.map((f, i) => (
          // Static wrapper anchors the figure by its base; the image inside does the motion.
          <div
            key={f.src}
            className="pointer-events-none absolute z-20 hidden -translate-x-1/2 -translate-y-full md:block"
            style={{ left: `${f.x}%`, top: f.y, width: `${f.w}%` }}
          >
            <motion.img
              src={f.src} alt={f.alt} draggable={false} loading="lazy"
              className="pointer-events-auto block w-full cursor-pointer select-none drop-shadow-[0_8px_10px_rgb(40_25_10/.35)]"
              style={{ originX: 0.5, originY: 1 }}
              initial={{ opacity: 0, y: 12, rotate: f.rotation }}
              animate={{ opacity: 1, y: 0, rotate: f.rotation }}
              transition={{ duration: 0.5, ease: ease.out, delay: 0.2 + i * 0.06 }}
              whileHover={{ rotate: [f.rotation, f.rotation - 7, f.rotation + 5, f.rotation], y: -4, transition: { duration: 0.5, ease: ease.out } }}
              whileTap={{ rotate: [f.rotation, f.rotation - 11, f.rotation + 9, f.rotation], scale: 1.08, transition: { duration: 0.45, ease: ease.out } }}
            />
          </div>
        ))}

        <div className="overflow-x-auto px-4 pb-4 sm:px-0">
          <div className="relative mx-auto w-[900px] max-w-none sm:w-[80%] sm:min-w-[640px]">
            <div className="frame rounded-md p-[2.2%]">
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
                {letters.map((l, i) => {
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

      <AnimatePresence>
        {open && <LetterOpen key="open" letter={open.letter} origin={open.rect} onClose={() => setOpen(null)} />}
        {studio && <LetterStudio key="studio" letters={letters} onClose={() => setStudio(false)} onPinned={onPinned} />}
      </AnimatePresence>
    </main>
    </MotionConfig>
  );
}

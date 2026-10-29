import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GRID_ROWS, boardRows, playThunk, type Letter } from "@/lib/letters";
import { ease, spring } from "@/lib/motion";
import { FIGURES } from "@/lib/figures";
import { BoardItem, Pin } from "@/components/letters/BoardItem";
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
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ letter: Letter; rect: DOMRect } | null>(null);
  const [studio, setStudio] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const knownIds = useRef<Set<string>>(new Set());

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

  const rows = boardRows(letters);
  const pages = rows / GRID_ROWS;

  return (
    <MotionConfig reducedMotion="user">
    <main className="wall relative min-h-screen overflow-x-hidden pb-28">
      <header className="relative z-10 px-6 pt-6 sm:px-10 sm:pt-8">
        <h1 className="-rotate-3 font-title text-6xl leading-none text-ink sm:text-7xl">for alif ♡</h1>
        <p className="ml-2 mt-1 -rotate-1 font-hand text-xl text-ink/70">{letters.length} {letters.length === 1 ? "letter" : "letters"} pinned</p>
      </header>
      <button onClick={() => { setMuted(!muted); localStorage.setItem("alif-muted", muted ? "0" : "1"); }} aria-label={muted ? "unmute" : "mute"} className="absolute right-4 top-4 z-20 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-card/80 text-ink shadow-item transition-transform duration-200 hover:scale-105 active:scale-95">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <section className="relative mx-auto mt-6 w-full sm:mt-4">
        {/* shelf */}
        <div className="pointer-events-none absolute left-[1%] top-[64%] z-0 hidden h-3 w-[11%] rounded-sm bg-wood shadow-item lg:block" />
        {FIGURES.map((f, i) => (
          <motion.img
            key={i} src={f.src} alt={f.alt} draggable={false}
            className="absolute z-20 hidden w-[6%] cursor-pointer select-none drop-shadow-lg md:block"
            style={{ left: `${f.x}%`, top: `${f.y}%`, rotate: f.rotation, scale: f.scale }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: ease.out, delay: 0.2 + i * 0.06 }}
            whileHover={{ rotate: [f.rotation, f.rotation - 8, f.rotation + 6, f.rotation], y: -4, transition: { duration: 0.5, ease: ease.out } }}
            whileTap={{ rotate: [f.rotation, f.rotation - 12, f.rotation + 10, f.rotation], scale: f.scale * 1.08, transition: { duration: 0.45, ease: ease.out } }}
          />
        ))}

        <div className="overflow-x-auto px-4 pb-4 sm:px-0">
          <div className="relative mx-auto w-[900px] max-w-none sm:w-[80%] sm:min-w-[640px]">
            <div className="frame rounded-md p-[2.2%]">
              <div className="cork relative w-full overflow-hidden rounded-sm" style={{ aspectRatio: `16 / ${10 * pages}` }}>
                {/* decorative pins + sticky note — only while the board is still mostly empty */}
                {letters.length < 6 && rows === GRID_ROWS && (
                  <>
                    <span className="absolute left-[30%] top-[8%]"><Pin color="#9CC9E8" /></span>
                    <span className="absolute left-[64%] top-[86%]"><Pin color="#F6E27A" /></span>
                    <span className="absolute left-[88%] top-[12%]"><Pin color="#D7263D" /></span>
                    <div className="absolute left-[42%] top-[38%] w-[16%] min-w-[110px] rotate-3 bg-butter p-3 font-hand text-lg leading-tight text-ink shadow-item">
                      <span className="absolute -top-2 left-1/2 h-4 w-3/5 -translate-x-1/2 -rotate-2 bg-tape opacity-80" />
                      pin something for alif :)
                    </div>
                  </>
                )}
                {letters.map((l, i) => (
                  <BoardItem key={l.id} letter={l} index={i} pages={pages} isNew={newIds.has(l.id)} onOpen={(rect) => setOpen({ letter: l, rect })} />
                ))}
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

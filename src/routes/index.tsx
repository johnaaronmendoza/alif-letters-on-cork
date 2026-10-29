import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playThunk, type Letter } from "@/lib/letters";
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
  const [open, setOpen] = useState<Letter | null>(null);
  const [studio, setStudio] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  useEffect(() => {
    setMuted(localStorage.getItem("alif-muted") === "1");
    supabase.from("letters").select("*").order("created_at").then(({ data }) => data && setLetters(data));
    const ch = supabase
      .channel(`letters-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "letters" }, (p) => addLetter(p.new as Letter))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "letters" }, (p) => setLetters((ls) => ls.filter((l) => l.id !== (p.old as Letter).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  function addLetter(l: Letter) {
    setLetters((ls) => {
      if (ls.some((x) => x.id === l.id)) return ls;
      setNewIds((s) => new Set(s).add(l.id));
      setTimeout(() => !mutedRef.current && playThunk(), 550);
      return [...ls, l];
    });
  }

  const onPinned = (l: Letter) => {
    setStudio(false);
    addLetter(l);
    setTimeout(() => document.getElementById(`letter-${l.id}`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }), 100);
  };

  return (
    <main className="wall relative min-h-screen overflow-x-hidden pb-28">
      <header className="relative z-10 px-6 pt-6 sm:px-10 sm:pt-8">
        <h1 className="-rotate-3 font-title text-6xl leading-none text-ink sm:text-7xl">for alif ♡</h1>
        <p className="ml-2 mt-1 -rotate-1 font-hand text-xl text-ink/70">{letters.length} {letters.length === 1 ? "letter" : "letters"} pinned</p>
      </header>
      <button onClick={() => { setMuted(!muted); localStorage.setItem("alif-muted", muted ? "0" : "1"); }} aria-label={muted ? "unmute" : "mute"} className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-card/80 text-ink shadow-item">
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
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.6 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ rotate: [f.rotation, f.rotation - 10, f.rotation + 10, f.rotation] }}
            whileTap={{ rotate: [f.rotation, f.rotation - 14, f.rotation + 14, f.rotation], scale: f.scale * 1.1 }}
          />
        ))}

        <div className="overflow-x-auto px-4 pb-4 sm:px-0">
          <div className="relative mx-auto w-[900px] max-w-none sm:w-[80%] sm:min-w-[640px]">
            <div className="frame rounded-md p-[2.2%]">
              <div className="cork relative aspect-[16/10] w-full overflow-hidden rounded-sm">
                {/* decorative pins + sticky note */}
                <span className="absolute left-[30%] top-[8%]"><Pin color="#9CC9E8" /></span>
                <span className="absolute left-[64%] top-[86%]"><Pin color="#F6E27A" /></span>
                <span className="absolute left-[88%] top-[12%]"><Pin color="#D7263D" /></span>
                <div className="absolute left-[42%] top-[38%] w-[16%] min-w-[110px] rotate-3 bg-butter p-3 font-hand text-lg leading-tight text-ink shadow-item">
                  <span className="absolute -top-2 left-1/2 h-4 w-3/5 -translate-x-1/2 -rotate-2 bg-tape opacity-80" />
                  pin something for alif :)
                </div>
                {letters.map((l) => (
                  <BoardItem key={l.id} letter={l} isNew={newIds.has(l.id)} onOpen={() => setOpen(l)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <motion.button
        onClick={() => setStudio(true)}
        className="paper-tag fixed bottom-5 right-5 z-40 px-5 py-3 pl-8 font-hand text-2xl text-ink shadow-paper"
        style={{ rotate: -4 }}
        animate={{ y: [0, -10, 0, -4, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 3.5 }}
        whileHover={{ scale: 1.06, rotate: -1 }}
      >
        ✉ write alif a letter
      </motion.button>

      <AnimatePresence>
        {open && <LetterOpen key="open" letter={open} onClose={() => setOpen(null)} />}
        {studio && <LetterStudio key="studio" letters={letters} onClose={() => setStudio(false)} onPinned={onPinned} />}
      </AnimatePresence>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { INTRO_PIECES } from "@/lib/intro";
import { ART_ASPECT, jitter } from "@/lib/letters";

/**
 * Plays over the collage on first load: bare cork, then every piece slaps on,
 * then the title stamps down with a board shake. Calls onDone when finished or
 * skipped; the real collage underneath is pixel-identical to the final frame.
 */
const STEP = 0.13;          // seconds between pieces
const FIRST = 0.3;          // first piece lands after this
const TITLE_GAP = 0.25;     // pause before the title
const HOLD = 0.55;          // hold the finished collage before handing over
const LOAD_TIMEOUT = 2500;  // give up and skip if the images are this slow

const pieces = INTRO_PIECES.filter((p) => p.name !== "title" && p.name !== "tracks");
const title = INTRO_PIECES.find((p) => p.name === "title");
const tracks = INTRO_PIECES.find((p) => p.name === "tracks");
/** The tyre tracks skid in at the same moment the Arsenal badge lands. */
const TRACKS_AT = FIRST + Math.max(0, pieces.findIndex((p) => p.name === "arsenal")) * STEP;
const zOf = (name: string) => INTRO_PIECES.findIndex((p) => p.name === name) + 1;
const src = (name: string) => `/board/intro/${name}.webp`;

export function BoardIntro({ onStamp, onDone }: { onStamp: () => void; onDone: () => void }) {
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    timers.current.forEach(clearTimeout);
    setLeaving(true);
  };

  // preload every piece so nothing pops in late; skip if it takes too long
  useEffect(() => {
    let alive = true;
    const urls = [src("empty"), ...INTRO_PIECES.map((p) => src(p.name))];
    const load = (u: string) => new Promise<void>((res) => {
      const img = new Image();
      img.onload = img.onerror = () => res();
      img.src = u;
    });
    const timeout = setTimeout(() => alive && finish(), LOAD_TIMEOUT);
    Promise.all(urls.map(load)).then(() => {
      clearTimeout(timeout);
      if (alive && !finished.current) setReady(true);
    });
    return () => { alive = false; clearTimeout(timeout); };
  }, []);

  // timeline: title lands, shake + stamp, hold, hand over
  useEffect(() => {
    if (!ready) return;
    const titleAt = FIRST + pieces.length * STEP + TITLE_GAP;
    const land = titleAt + 0.22;
    timers.current.push(setTimeout(onStamp, land * 1000));
    timers.current.push(setTimeout(finish, (land + HOLD) * 1000));
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Esc skips
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const titleAt = FIRST + pieces.length * STEP + TITLE_GAP;

  return (
    <>
      <AnimatePresence onExitComplete={onDone}>
        {!leaving && (
          <motion.div
            key="intro"
            className="cork-photo pointer-events-none absolute left-0 top-0 z-40 w-full overflow-hidden"
            style={{ aspectRatio: `${ART_ASPECT}` }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            aria-hidden
          >
            {ready && (
              <>
                <img src={src("empty")} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
                {tracks && (
                  <motion.img
                    src={src("tracks")} alt="" draggable={false}
                    className="absolute select-none"
                    style={{ left: `${tracks.x}%`, top: `${tracks.y}%`, width: `${tracks.w}%`, zIndex: zOf("tracks") }}
                    // a quick skid: the stain wipes on from the left, along the direction of travel
                    initial={{ clipPath: "inset(0% 100% 0% 0%)", opacity: 0.6 }}
                    animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
                    transition={{ delay: TRACKS_AT - 0.05, duration: 0.38, ease: [0.3, 0.7, 0.4, 1] }}
                  />
                )}
                {pieces.map((p, i) => (
                  <Piece key={p.name} name={p.name} box={p} delay={FIRST + i * STEP} />
                ))}
                {title && (
                  <motion.img
                    src={src("title")} alt="" draggable={false}
                    className="absolute select-none"
                    style={{ left: `${title.x}%`, top: `${title.y}%`, width: `${title.w}%`, zIndex: zOf("title"), filter: "drop-shadow(0 6px 8px rgb(30 10 0 / .35))" }}
                    initial={{ opacity: 0, scale: 2.6, rotate: -8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    // accelerates into the board, like a rubber stamp
                    transition={{ delay: titleAt, duration: 0.22, ease: [0.55, 0, 0.85, 0.25], opacity: { delay: titleAt, duration: 0.06 } }}
                  />
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!leaving && (
          <motion.button
            key="skip"
            type="button"
            onClick={finish}
            className="fixed bottom-6 left-1/2 z-50 min-h-11 -translate-x-1/2 rounded-full bg-[#1c140e]/70 px-5 font-clean text-sm tracking-wide text-white shadow-lg backdrop-blur transition-colors hover:bg-[#1c140e]/85"
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.6 } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            skip intro ›
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

function Piece({ name, box, delay }: { name: string; box: { x: number; y: number; w: number }; delay: number }) {
  const tilt = jitter(name, 3) * 12;
  return (
    <motion.img
      src={src(name)} alt="" draggable={false}
      className="absolute select-none"
      style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, zIndex: zOf(name) }}
      // lifted off the board (bigger, tilted, deep shadow) → slapped flat
      initial={{ opacity: 0, scale: 1.45, rotate: tilt, y: "-6%", filter: "drop-shadow(0 22px 18px rgb(30 10 0 / .35))" }}
      animate={{ opacity: 1, scale: 1, rotate: 0, y: "0%", filter: "drop-shadow(0 3px 3px rgb(30 10 0 / .3))" }}
      transition={{ delay, type: "spring", stiffness: 520, damping: 26, mass: 0.8, opacity: { delay, duration: 0.08 }, filter: { delay, duration: 0.25 } }}
    />
  );
}

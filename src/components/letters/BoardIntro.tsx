import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useAnimate } from "framer-motion";
import { INTRO_PIECES, type IntroPiece } from "@/lib/intro";
import { ART_ASPECT, jitter } from "@/lib/letters";
import { spring } from "@/lib/motion";

/**
 * Plays over the collage on first load. The camera settles on bare cork, the pieces
 * land with a rhythm that speeds up into a flurry, a beat of silence, then the title
 * stamps down (shake, flash, dust). Calls onDone when finished or skipped; the real
 * collage underneath is pixel-identical to the final frame.
 */
const FIRST = 0.45;         // first piece lands after the camera settles
const SPAN = 1.75;          // time over which the other pieces land
const ACCEL = 0.72;         // <1: gaps shrink as it goes (slow start → flurry)
const TITLE_GAP = 0.42;     // the beat before the title
const STAMP = 0.2;          // title travel time
const HOLD = 0.6;           // hold the finished collage before handing over
const LOAD_TIMEOUT = 4000;  // give up and skip if the first frame is this slow

const pieces = INTRO_PIECES.filter((p) => p.name !== "title" && p.name !== "tracks");
const title = INTRO_PIECES.find((p) => p.name === "title");
const tracks = INTRO_PIECES.find((p) => p.name === "tracks");
const zOf = (name: string) => INTRO_PIECES.findIndex((p) => p.name === name) + 1;
const src = (name: string) => `/board/intro/${name}.webp`;

/** When each piece lands: an accelerating rhythm instead of a metronome. */
const delayOf = (i: number) => FIRST + SPAN * Math.pow(i / Math.max(1, pieces.length - 1), ACCEL);
const LAST = delayOf(pieces.length - 1);
const TITLE_AT = LAST + TITLE_GAP;
const LAND = TITLE_AT + STAMP;
const TRACKS_AT = delayOf(Math.max(0, pieces.findIndex((p) => p.name === "arsenal")));

/** How each kind of piece arrives. */
type Move = "toss" | "slap" | "swing";
const MOVES: Record<string, Move> = {
  "strip-left": "toss", "strip-right": "toss", a7x: "toss", "polaroid-r": "toss", "polaroid-l": "toss", "polaroid-tr": "toss",
  keychain: "swing",
};

export function BoardIntro({ onStamp, onImpact, onDone }: { onStamp: () => void; onImpact: () => void; onDone: () => void }) {
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [camera, animateCamera] = useAnimate();
  const finished = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    timers.current.forEach(clearTimeout);
    setLeaving(true);
  };

  // start as soon as the bare board and the first few pieces are in; the rest keep
  // loading while those animate (each piece waits its turn anyway). Skip if slow.
  useEffect(() => {
    let alive = true;
    const load = (u: string) => new Promise<void>((res) => {
      const img = new Image();
      img.onload = img.onerror = () => res();
      img.src = u;
    });
    const first = [src("empty"), ...pieces.slice(0, 4).map((p) => src(p.name))];
    const rest = INTRO_PIECES.map((p) => src(p.name)).filter((u) => !first.includes(u));
    const timeout = setTimeout(() => alive && finish(), LOAD_TIMEOUT);
    Promise.all(first.map(load)).then(() => {
      clearTimeout(timeout);
      if (alive && !finished.current) setReady(true);
    });
    rest.forEach((u) => void load(u));
    return () => { alive = false; clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timeline: heavy pieces nudge the board as they land; the title stamps; hand over
  useEffect(() => {
    if (!ready) return;
    const at = (s: number, fn: () => void) => timers.current.push(setTimeout(fn, s * 1000));
    pieces.forEach((p, i) => { if (MOVES[p.name] === "toss") at(delayOf(i) + 0.3, onImpact); });
    at(LAND, () => {
      onStamp();
      // camera punch on impact
      if (camera.current) void animateCamera(camera.current, { scale: [1, 1.03, 1] }, { duration: 0.42, ease: "easeOut" });
    });
    at(LAND + HOLD, finish);
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Esc skips
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  return (
    <>
      <AnimatePresence onExitComplete={onDone}>
        {!leaving && (
          <m.div
            key="intro"
            className="cork-photo pointer-events-none absolute left-0 top-0 z-40 w-full overflow-hidden"
            style={{ aspectRatio: `${ART_ASPECT}` }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            aria-hidden
          >
            {ready && (
              // the "camera": settles in on the bare board, punches in when the title lands
              <m.div
                ref={camera}
                className="absolute inset-0"
                initial={{ scale: 1.07 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <img src={src("empty")} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
                {tracks && (
                  <m.img
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
                  <Piece key={p.name} piece={p} delay={delayOf(i)} move={MOVES[p.name] ?? "slap"} />
                ))}
                {title && <Title piece={title} />}
                <Dust />
                {/* a quick flash as the stamp hits */}
                <m.div
                  className="absolute inset-0 bg-[#fff8ec]"
                  style={{ zIndex: 60 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ delay: LAND, duration: 0.32, times: [0, 0.2, 1] }}
                />
              </m.div>
            )}
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!leaving && (
          <m.button
            key="skip"
            type="button"
            onClick={finish}
            className="fixed bottom-6 left-1/2 z-50 min-h-11 -translate-x-1/2 rounded-full bg-[#1c140e]/80 px-5 font-clean text-sm tracking-wide text-white shadow-lg transition-colors hover:bg-[#1c140e]/85"
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.6 } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            skip intro ›
          </m.button>
        )}
      </AnimatePresence>
    </>
  );
}

/** One collage piece. Only transform + opacity animate; its shadow is baked into the image. */
function Piece({ piece: p, delay, move }: { piece: IntroPiece; delay: number; move: Move }) {
  const fromLeft = p.x + p.w / 2 < 50;
  const spin = jitter(p.name, 3);
  const style = { left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, zIndex: zOf(p.name) };

  if (move === "toss") {
    // photos and the poster are tossed in from the nearest side, spinning, and settle with a small bounce
    return (
      <m.img
        src={src(p.name)} alt="" draggable={false} className="absolute select-none" style={style}
        initial={{ opacity: 0, x: fromLeft ? "-90%" : "90%", y: "-35%", rotate: (fromLeft ? -1 : 1) * (22 + spin * 10), scale: 1.12 }}
        animate={{ opacity: 1, x: "0%", y: "0%", rotate: 0, scale: 1 }}
        transition={{ ...spring.toss, delay, opacity: { delay, duration: 0.1 } }}
      />
    );
  }
  if (move === "swing") {
    // the keychain swings in from its ring like a pendulum
    return (
      <m.img
        src={src(p.name)} alt="" draggable={false} className="absolute select-none" style={{ ...style, originX: 0.72, originY: 0.06 }}
        initial={{ opacity: 0, rotate: -55 }}
        animate={{ opacity: 1, rotate: [-55, 22, -11, 5, -2, 0] }}
        transition={{ delay, duration: 1.1, times: [0, 0.28, 0.5, 0.7, 0.86, 1], ease: "easeOut", opacity: { delay, duration: 0.08 } }}
      />
    );
  }
  // stickers are slapped flat: drop in big, squash on contact, settle
  return (
    <m.img
      src={src(p.name)} alt="" draggable={false} className="absolute select-none" style={style}
      initial={{ opacity: 0, scale: 1.7, rotate: spin * 14 }}
      animate={{ opacity: 1, scale: [1.7, 0.93, 1.03, 1], rotate: [spin * 14, spin * -2, 0, 0] }}
      transition={{ delay, duration: 0.42, times: [0, 0.5, 0.78, 1], ease: "easeOut", opacity: { delay, duration: 0.07 } }}
    />
  );
}

/** The title slams down like a rubber stamp, squashes on impact, and settles. */
function Title({ piece: t }: { piece: IntroPiece }) {
  return (
    <m.img
      src={src("title")} alt="" draggable={false}
      className="absolute select-none"
      style={{ left: `${t.x}%`, top: `${t.y}%`, width: `${t.w}%`, zIndex: zOf("title") }}
      initial={{ opacity: 0, scale: 2.8, rotate: -9 }}
      animate={{ opacity: 1, scale: [2.8, 1, 0.95, 1.015, 1], rotate: [-9, 0, 0, 0, 0] }}
      transition={{ delay: TITLE_AT, duration: STAMP + 0.3, times: [0, 0.4, 0.58, 0.8, 1], ease: [0.55, 0, 0.85, 0.25], opacity: { delay: TITLE_AT, duration: 0.06 } }}
    />
  );
}

/** Specks of dust and paper fibre kicked up around the title when it lands. */
function Dust() {
  if (!title) return null;
  const cx = title.x + title.w / 2, cy = title.y + title.h / 2;
  return (
    <>
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2 + jitter(`dust${i}`, 1) * 0.3;
        const dist = 15 + (jitter(`dust${i}`, 2) + 1) * 7;   // % of the board width
        const size = 0.35 + (jitter(`dust${i}`, 3) + 1) * 0.3;
        return (
          <m.span
            key={i}
            className="absolute block rounded-full"
            style={{
              left: `${cx}%`, top: `${cy}%`, width: `${size}%`, aspectRatio: "1", zIndex: 59,
              background: i % 3 ? "rgb(92 58 32 / .7)" : "rgb(255 248 236 / .85)",
            }}
            initial={{ opacity: 0, x: 0, y: 0 }}
            // % translate is relative to the speck itself, so scale board distances by its size
            animate={{ opacity: [0, 1, 0], x: `${(Math.cos(a) * dist / size) * 100}%`, y: `${(Math.sin(a) * dist * 0.55 / size) * 100}%` }}
            transition={{ delay: LAND, duration: 0.65, times: [0, 0.15, 1], ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

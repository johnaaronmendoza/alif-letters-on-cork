import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { envelopeFor, type EnvelopeColor, type Letter, type Sticker } from "@/lib/letters";
import { ease, fadeOut, spring } from "@/lib/motion";
import { LetterPaper } from "./LetterPaper";
import { LetterCanvas, useSrc } from "./LetterCanvas";
import { Photocard } from "./Photocard";
import { backgroundCss, isCanvasLetter, readCanvas } from "@/lib/canvas";

/**
 * Opening a letter, after the reference video:
 * sealed → seal cracks + envelope wobbles → flap swings open → folded letter
 * slides up out of the envelope → it unfolds into the full letter.
 */
type Stage = "sealed" | "breaking" | "flap" | "rise" | "open";
const TIMELINE: [Stage, number][] = [["breaking", 0], ["flap", 380], ["rise", 900], ["open", 1650]];

const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .25 0 0 0 0 .2 0 0 0 .12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")";

/** Offset that places the centered envelope back over the item that was tapped. */
function fromOrigin(origin: DOMRect | undefined) {
  if (typeof window === "undefined" || !origin) return { x: 0, y: 40, scale: 0.6 };
  // same size as the opened envelope: min(400px, 86vw, (100svh - 12rem) × 1.3)
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const width = Math.min(400, window.innerWidth * 0.86, (window.innerHeight - 12 * rem) * 1.3);
  return {
    x: origin.left + origin.width / 2 - window.innerWidth / 2,
    y: origin.top + origin.height / 2 - window.innerHeight / 2,
    scale: Math.max(0.15, origin.width / width),
  };
}

export function LetterOpen({ letter, origin, onClose }: { letter: Letter; origin?: DOMRect; onClose: () => void }) {
  const [start] = useState(() => fromOrigin(origin));
  const [stage, setStage] = useState<Stage>("sealed");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduce = useReducedMotion();
  const env = envelopeFor(letter.id);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.key === "Enter" || e.key === " ") && stage === "sealed") { e.preventDefault(); open(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const open = () => {
    if (stage !== "sealed") return;
    if (reduce) { setStage("open"); return; }
    timers.current = TIMELINE.map(([s, at]) => setTimeout(() => setStage(s), at));
  };

  const flapOpen = stage === "flap" || stage === "rise";

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.3, ease: ease.out } }} exit={{ opacity: 0, transition: fadeOut }}
      onClick={onClose}
      role="dialog" aria-modal="true" aria-label={`letter from ${letter.from_name}`}
    >
      {/* soft, warm backdrop instead of a flat dark wash */}
      <div className="fixed inset-0 bg-[#1c140e]/55 backdrop-blur-md" />
      <div className="pointer-events-none fixed inset-0" style={{ background: `radial-gradient(ellipse at 50% 45%, ${env.paper}33 0%, transparent 60%)` }} />

      <button onClick={onClose} aria-label="close"
        className="fixed right-4 top-4 z-20 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/90 text-ink shadow-item backdrop-blur transition-transform duration-200 hover:scale-105 active:scale-95">
        <X className="h-5 w-5" />
      </button>

      <div className="relative flex min-h-full items-center justify-center px-5 py-12">
        <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-xl">
          <AnimatePresence mode="wait">
            {stage !== "open" ? (
              <motion.div
                key="envelope"
                initial={{ ...start, rotate: letter.rotation, opacity: 0.5 }}
                animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                exit={{ y: 140, opacity: 0, scale: 0.94, transition: { duration: 0.3, ease: ease.in } }}
                transition={{ ...spring.soft, opacity: { duration: 0.2 } }}
                className="mx-auto"
                style={{ width: "min(400px, 86vw, calc((100svh - 12rem) * 1.3))" }}
              >
                <Envelope env={env} stage={stage} flapOpen={flapOpen} from={letter.from_name} onOpen={open} />
                <motion.p
                  animate={{ opacity: stage === "sealed" ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 text-center font-clean text-sm tracking-wide text-white/85"
                >
                  tap the seal to open
                </motion.p>
              </motion.div>
            ) : (
              <motion.div key="letter" className="relative mx-auto w-full">
                <OpenedLetter letter={letter} env={env} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── the envelope ──────────────────────────────────────────────────

/**
 * The opened envelope is the same photo as on the board, cut into layers:
 * the inside (drawn), the letter, the front pocket, the flap and the push pin.
 * Coordinates are in the 1063×809 envelope photo.
 */
const ENV = { w: 1063, h: 809, body: { x: 5, y: 101, w: 1041, h: 692 }, tip: { x: 522, y: 600 } };
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function Envelope({ env, stage, flapOpen, from, onOpen }: {
  env: EnvelopeColor; stage: Stage; flapOpen: boolean; from: string; onOpen: () => void;
}) {
  const sealed = stage === "sealed";
  const layer = (part: "pocket" | "flap" | "pin") => `/board/envelopes/open/${env.name}-${part}.webp`;
  const body = { left: pct(ENV.body.x, ENV.w), top: pct(ENV.body.y, ENV.h), width: pct(ENV.body.w, ENV.w), height: pct(ENV.body.h, ENV.h) };

  return (
    <motion.div
      // unpinned: the envelope floats free once the pin pops out, and wobbles when the seal breaks
      initial={{ y: 0 }}
      animate={stage === "breaking" ? { rotate: [0, -2.5, 2, -1, 0], y: [0, -4, 0] } : { rotate: 0, y: [0, -8, -4] }}
      transition={stage === "breaking" ? { duration: 0.5, ease: "easeInOut" } : { duration: 0.9, delay: 0.75, ease: "easeOut" }}
      className="relative w-full"
      style={{ aspectRatio: `${ENV.w} / ${ENV.h}`, perspective: 1400, filter: "drop-shadow(0 22px 26px rgb(20 10 0 / .45))" }}
    >
      {/* the inside of the envelope, seen through the opening */}
      <div className="absolute rounded-[3px]" style={{ ...body, zIndex: 1, background: `linear-gradient(180deg, ${env.inside} 0%, ${env.shade} 70%)`, boxShadow: "inset 0 10px 18px rgb(0 0 0 / .18)" }} />

      {/* the letter, tucked inside */}
      <motion.div
        className="absolute inset-x-[9%] top-[15%] h-[70%] rounded-[2px] bg-[#fdfbf6]"
        style={{ zIndex: 3, backgroundImage: PAPER_GRAIN, boxShadow: "0 2px 6px rgb(0 0 0 / .14)" }}
        animate={stage === "rise" ? { y: "-62%" } : { y: "0%" }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        <div className="absolute inset-x-0 top-1/3 h-px bg-black/[.07] shadow-[0_1px_0_rgb(255_255_255/.8)]" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-black/[.07] shadow-[0_1px_0_rgb(255_255_255/.8)]" />
        <div className="absolute left-[9%] top-[9%] font-hand text-[clamp(14px,4vw,22px)] text-ink/70">dear alif,</div>
        <div className="absolute inset-x-[9%] top-[22%] space-y-[6%]">
          {[88, 72, 80].map((w, k) => <div key={k} className="h-[2px] rounded-full bg-ink/10" style={{ width: `${w}%` }} />)}
        </div>
      </motion.div>

      {/* front pocket (photo) */}
      <img src={layer("pocket")} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" style={{ zIndex: 4 }} />

      {/* who it's from: a typed label taped to the front */}
      <motion.div
        className="pointer-events-none absolute bottom-[5.5%] left-1/2 -translate-x-1/2"
        style={{ zIndex: 5 }}
        animate={{ opacity: stage === "rise" ? 0 : 1 }}
      >
        <div className="relative -rotate-2 bg-[#f8f4ea] px-[1.1em] py-[0.45em] font-typewriter text-[clamp(12px,3.2vw,17px)] text-ink shadow-[0_1px_2px_rgb(0_0_0/.18),0_4px_8px_-2px_rgb(0_0_0/.15)]"
          style={{ backgroundImage: PAPER_GRAIN }}>
          <span className="absolute -top-[0.55em] left-1/2 h-[1.1em] w-[3.4em] -translate-x-1/2 rotate-3 bg-tape/80" />
          from {from}
        </div>
      </motion.div>

      {/* the flap (photo): swings up and back, passing behind the letter halfway */}
      <motion.div
        className="absolute inset-0"
        style={{ zIndex: flapOpen ? 2 : 6, transformStyle: "preserve-3d", originX: 0.5, originY: ENV.body.y / ENV.h }}
        initial={false}
        animate={{ rotateX: flapOpen ? 178 : 0 }}
        transition={{ duration: 0.55, ease: [0.45, 0, 0.2, 1] }}
      >
        <img src={layer("flap")} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" style={{ backfaceVisibility: "hidden" }} />
        {/* inside of the flap: same paper, in shade */}
        <img src={layer("flap")} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none"
          style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)", filter: "brightness(.82) saturate(.9)" }} />
      </motion.div>

      {/* wax seal on the flap tip */}
      <button
        type="button"
        onClick={onOpen}
        disabled={!sealed}
        aria-label="break the seal and open the letter"
        className="absolute w-[17%] -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-transparent disabled:cursor-default"
        style={{ zIndex: 7, left: pct(ENV.tip.x, ENV.w), top: pct(ENV.tip.y - 30, ENV.h) }}
      >
        <WaxSeal stage={stage} />
      </button>

      {/* the push pin from the board pops out first */}
      <motion.img
        src={layer("pin")} alt="" draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        style={{ zIndex: 8, originX: 0.5, originY: 0.2 }}
        initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
        animate={{ y: [0, 6, -70], x: [0, 0, 24], rotate: [0, 0, 28], opacity: [1, 1, 0] }}
        transition={{ duration: 0.6, delay: 0.45, times: [0, 0.25, 1], ease: "easeOut" }}
      />
    </motion.div>
  );
}

function WaxSeal({ stage }: { stage: Stage }) {
  const broken = stage !== "sealed";
  const face = (
    <img src="/board/seal.webp" alt="" width={480} height={475} draggable={false}
      className="block w-full select-none" style={{ filter: "drop-shadow(0 4px 4px rgb(40 0 0 / .4))" }} />
  );
  if (!broken) {
    return (
      <motion.span
        className="block"
        // a gentle "tap me" pulse, three times, then it rests
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 0.8, ease: "easeInOut", delay: 0.7, repeat: 2, repeatDelay: 1.4 }}
        whileHover={{ scale: 1.07, transition: spring.snappy }}
        whileTap={{ scale: 0.92, transition: spring.snappy }}
      >
        {face}
      </motion.span>
    );
  }
  return (
    <span className="relative block">
      {[-1, 1].map((side) => (
        <motion.span
          key={side}
          className="absolute inset-0 block"
          style={{ clipPath: side < 0 ? "polygon(0 0, 52% 0, 46% 38%, 54% 60%, 47% 100%, 0 100%)" : "polygon(52% 0, 100% 0, 100% 100%, 47% 100%, 54% 60%, 46% 38%)" }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: side * 26, y: 70, rotate: side * 38, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.9, 0.6] }}
        >
          {face}
        </motion.span>
      ))}
      <span className="invisible block">{face}</span>
    </span>
  );
}

// ── the opened letter ────────────────────────────────────────────

function OpenedLetter({ letter, env }: { letter: Letter; env: EnvelopeColor }) {
  const canvas = isCanvasLetter(letter.stickers);
  const hasCard = canvas && readCanvas(letter.stickers).photocard && !!letter.photo_url;
  const card = useSrc(hasCard ? letter.photo_url : null);
  return (
    <motion.div
      className="relative mx-auto"
      // the page is 3:4, so size it by the window height: it fits without scrolling.
      // 12rem = outer padding (6rem) + "from" label (~2.5rem) + the panel's padding (3.5rem)
      style={canvas ? { width: "min(100%, calc((100svh - 12rem) * 0.75 + 3.5rem))" } : undefined}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...spring.soft, opacity: { duration: 0.2 } }}
    >
      <div className="mb-4 flex items-center justify-center gap-3 text-white/85">
        <span className="h-px w-10 bg-white/40" />
        <span className="font-clean text-xs uppercase tracking-[0.25em]">from {letter.from_name}</span>
        <span className="h-px w-10 bg-white/40" />
      </div>

      {/* unfolds from its middle third, like a tri-folded letter opening up */}
      <motion.div
        initial={{ clipPath: "inset(33.4% 0% 33.4% 0% round 18px)" }}
        animate={{ clipPath: "inset(0% 0% 0% 0% round 18px)" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="relative"
      >
        {canvas ? (
          <div className="rounded-[18px] p-4 sm:p-7" style={{ background: backgroundCss(letter.paper_style), boxShadow: "0 30px 60px -20px rgb(0 0 0 / .55)" }}>
            <LetterCanvas elements={readCanvas(letter.stickers).elements} paper={readCanvas(letter.stickers).paper} mode="view" />
          </div>
        ) : (
          <div className="rounded-[18px] p-4 sm:p-7" style={{ background: env.paper, boxShadow: "0 30px 60px -20px rgb(0 0 0 / .55)" }}>
            <LetterPaper data={{ ...letter, stickers: (letter.stickers as Sticker[]) ?? [] }} />
          </div>
        )}
        {/* crease shadows that fade as the paper flattens */}
        {[33.4, 66.6].map((top) => (
          <motion.div key={top} className="pointer-events-none absolute inset-x-0 h-6 -translate-y-1/2"
            style={{ top: `${top}%`, background: "linear-gradient(180deg, transparent, rgb(0 0 0 / .14), transparent)" }}
            initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.9, delay: 0.55 }} />
        ))}
      </motion.div>

      {/* the photocard slides out from behind the letter once it has unfolded */}
      {hasCard && (
        <motion.div
          className="absolute -right-[3%] top-[46%] z-10 w-[38%] sm:-right-[14%]"
          initial={{ opacity: 0, x: -60, rotate: 0 }}
          animate={{ opacity: 1, x: 0, rotate: 6 }}
          transition={{ ...spring.soft, delay: 0.8, opacity: { duration: 0.2, delay: 0.8 } }}
          whileHover={{ rotate: 2, y: -6, scale: 1.03, transition: spring.soft }}
        >
          <Photocard src={card} />
        </motion.div>
      )}
    </motion.div>
  );
}

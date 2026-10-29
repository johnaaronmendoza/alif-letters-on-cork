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
  const width = Math.min(440, window.innerWidth - 40);
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
                className="mx-auto w-full max-w-[440px]"
              >
                <Envelope env={env} stage={stage} flapOpen={flapOpen} from={letter.from_name} onOpen={open} />
                <motion.p
                  animate={{ opacity: stage === "sealed" ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-8 text-center font-clean text-sm tracking-wide text-white/85"
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

function Envelope({ env, stage, flapOpen, from, onOpen }: {
  env: EnvelopeColor; stage: Stage; flapOpen: boolean; from: string; onOpen: () => void;
}) {
  const sealed = stage === "sealed";
  const paper = { backgroundColor: env.paper, backgroundImage: PAPER_GRAIN };

  return (
    <motion.div
      // a small "something's coming" wobble when the seal breaks
      animate={stage === "breaking" ? { rotate: [0, -2.5, 2, -1, 0], y: [0, -4, 0] } : { rotate: 0, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="relative aspect-[10/7] w-full"
      style={{ perspective: 1400 }}
    >
      {/* inside of the envelope, seen once the flap is up */}
      <div className="absolute inset-0 rounded-[3px]" style={{ background: `linear-gradient(180deg, ${env.inside}, ${env.shade})`, boxShadow: "0 24px 50px -18px rgb(20 10 0 / .55), 0 6px 14px rgb(20 10 0 / .25)" }} />

      {/* the folded letter, tucked inside */}
      <motion.div
        className="absolute inset-x-[7%] top-[6%] h-[82%] rounded-[2px] bg-[#fdfbf6]"
        style={{ zIndex: 2, backgroundImage: PAPER_GRAIN, boxShadow: "0 2px 6px rgb(0 0 0 / .12)" }}
        animate={stage === "rise" ? { y: "-58%" } : { y: "0%" }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        {/* fold creases and a hint of handwriting */}
        <div className="absolute inset-x-0 top-1/3 h-px bg-black/[.07] shadow-[0_1px_0_rgb(255_255_255/.8)]" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-black/[.07] shadow-[0_1px_0_rgb(255_255_255/.8)]" />
        <div className="absolute left-[10%] top-[10%] font-hand text-[clamp(14px,4vw,22px)] text-ink/70">dear alif,</div>
        <div className="absolute inset-x-[10%] top-[22%] space-y-[6%]">
          {[88, 72, 80].map((w, i) => <div key={i} className="h-[2px] rounded-full bg-ink/10" style={{ width: `${w}%` }} />)}
        </div>
      </motion.div>

      {/* front pocket: side and bottom folds */}
      <svg viewBox="0 0 100 70" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ zIndex: 3 }} aria-hidden>
        <defs>
          <linearGradient id="side-l" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".22" /><stop offset="1" stopColor="#000" stopOpacity=".04" /></linearGradient>
          <linearGradient id="side-r" x1="1" x2="0"><stop offset="0" stopColor="#000" stopOpacity=".08" /><stop offset="1" stopColor="#000" stopOpacity=".02" /></linearGradient>
          <linearGradient id="bottom" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#000" stopOpacity=".06" /><stop offset="1" stopColor="#fff" stopOpacity=".18" /></linearGradient>
        </defs>
        <path d="M0 0 L47 38 Q50 40 53 38 L100 0 V70 H0 Z" fill={env.paper} />
        <path d="M0 0 L46 39 L0 70 Z" fill="url(#side-l)" />
        <path d="M100 0 L54 39 L100 70 Z" fill="url(#side-r)" />
        <path d="M0 70 L46 37 Q50 34.5 54 37 L100 70 Z" fill={env.paper} />
        <path d="M0 70 L46 37 Q50 34.5 54 37 L100 70 Z" fill="url(#bottom)" />
        <path d="M0 70 L46 37 Q50 34.5 54 37 L100 70" fill="none" stroke={env.shade} strokeWidth=".35" />
      </svg>
      <div className="pointer-events-none absolute inset-0 rounded-[3px] opacity-70 mix-blend-multiply" style={{ zIndex: 3, backgroundImage: PAPER_GRAIN }} />

      {/* "from" written on the front */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-[11%] text-center font-hand text-[clamp(18px,5vw,28px)]"
        style={{ zIndex: 4, color: env.ink }}
        animate={{ opacity: stage === "rise" ? 0 : 1 }}
      >
        from {from}
      </motion.div>

      {/* top flap: swings up and back, passing behind the letter halfway through */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[60%] origin-top"
        style={{ zIndex: flapOpen ? 1 : 5, transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateX: flapOpen ? 178 : 0 }}
        transition={{ duration: 0.55, ease: [0.45, 0, 0.2, 1] }}
      >
        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", filter: "drop-shadow(0 2px 2px rgb(30 15 0 / .18))" }}>
          <div className="absolute inset-0" style={{ ...paper, clipPath: "polygon(0 0, 100% 0, 54% 92%, 50% 96%, 46% 92%)" }}>
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(255 255 255 / .25), rgb(0 0 0 / .05))" }} />
          </div>
        </div>
        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(0deg, ${env.shade}, ${env.inside})`, clipPath: "polygon(0 100%, 100% 100%, 54% 8%, 50% 4%, 46% 8%)" }} />
        </div>
      </motion.div>

      {/* wax seal */}
      <button
        type="button"
        onClick={onOpen}
        disabled={!sealed}
        aria-label="break the seal and open the letter"
        className="absolute left-1/2 top-[57.5%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-transparent disabled:cursor-default"
        style={{ zIndex: 6 }}
      >
        <WaxSeal stage={stage} />
      </button>
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
            <LetterCanvas elements={readCanvas(letter.stickers).elements} mode="view" />
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

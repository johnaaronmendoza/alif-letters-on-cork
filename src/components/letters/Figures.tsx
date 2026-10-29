import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { FIGURES, type Figure } from "@/lib/figures";
import { ease, spring } from "@/lib/motion";

/**
 * The figures around the board, each with a tap toy:
 * money gun → cash burst · cigarettes → lighter flick, then "nope." ·
 * mints → tin rattles and mints bounce out · doll → eyes follow you.
 *
 * Until someone taps one, each wiggles a few times (one at a time) and then rests;
 * after the first tap that stops for good in this browser.
 */
const FoundContext = createContext<() => void>(() => {});

export function BoardFigures({ muted, layout = "corners" }: { muted: boolean; layout?: "corners" | "shelf" }) {
  const [found, setFound] = useState(true); // assume found until we've checked, so nothing flashes
  useEffect(() => {
    try { setFound(localStorage.getItem("alif-toys-found") === "1"); } catch { setFound(false); }
  }, []);
  const markFound = () => {
    if (found) return;
    setFound(true);
    try { localStorage.setItem("alif-toys-found", "1"); } catch { /* storage blocked */ }
  };

  const toy = (f: Figure, i: number) => (
    <motion.div
      className="relative"
      style={{ rotate: layout === "shelf" ? f.rotation * 0.5 : f.rotation, originX: 0.5, originY: 1 }}
      // finale: the figures pop in one after another
      initial={{ opacity: 0, scale: 0.35, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 15, delay: 0.15 + i * 0.12, opacity: { duration: 0.12, delay: 0.15 + i * 0.12 } }}
    >
      {/* idle wiggle, staggered, until a toy has been found */}
      <motion.div
        style={{ originX: 0.5, originY: 1 }}
        animate={found ? { rotate: 0 } : { rotate: [0, -7, 6, -4, 2, 0] }}
        // three wiggles each, one figure at a time, then they rest (no endless decorative motion)
        transition={found ? { duration: 0.2 } : { duration: 0.8, delay: 4 + i * 2.6, repeat: 2, repeatDelay: 11, ease: "easeInOut" }}
      >
        {f.toy === "money-gun" && <MoneyGun f={f} muted={muted} />}
        {f.toy === "lighter" && <Lighter f={f} muted={muted} />}
        {f.toy === "mints" && <Mints f={f} muted={muted} />}
        {f.toy === "doll" && <Doll f={f} />}
      </motion.div>
    </motion.div>
  );

  return (
    <FoundContext.Provider value={markFound}>
      {layout === "corners" ? (
        <>
          {FIGURES.map((f, i) => (
            // Static wrapper anchors the figure by its base on its corner of the board.
            <div key={f.src} className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
              style={{ left: `${f.x}%`, top: f.y, width: `${f.w}%` }}>
              {toy(f, i)}
            </div>
          ))}
        </>
      ) : (
        // phones: the figures stand on a little shelf under the collage
        <div className="relative px-[3%] pb-3 pt-4">
          <div className="relative z-10 flex items-end justify-around">
            {FIGURES.map((f, i) => (
              <div key={f.src} className="w-[20%]">{toy(f, i)}</div>
            ))}
          </div>
          <div className="mx-[1%] -mt-1 h-2.5 rounded-[2px] bg-[linear-gradient(180deg,#d9b884,#b58e57)] shadow-[0_4px_6px_-2px_rgb(40_25_10/.5)]" aria-hidden />
        </div>
      )}
    </FoundContext.Provider>
  );
}

/** Clickable figure image with a gentle hover lift. */
function Toy({ label, onTap, children }: { label: string; onTap: () => void; children: ReactNode }) {
  const found = useContext(FoundContext);
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => { found(); onTap(); }}
      className="pointer-events-auto relative block w-full cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
      whileHover={{ y: -4, scale: 1.03, transition: spring.soft }}
      whileTap={{ scale: 0.96, transition: spring.snappy }}
    >
      {children}
    </motion.button>
  );
}

const figureImg = "block w-full select-none drop-shadow-[0_8px_10px_rgb(40_25_10/.35)]";
const rand = (a: number, b: number) => a + Math.random() * (b - a);
let burstId = 0;

// ── money gun ─────────────────────────────────────────────────────

type Bill = { id: number; x: number; y: number; up: number; spin: number; flips: number; dur: number; delay: number };

function MoneyGun({ f, muted }: { f: Figure; muted: boolean }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [scope, animate] = useAnimate();

  const fire = () => {
    if (scope.current) void animate(scope.current, { rotate: [0, -9, 3, 0], x: [0, -6, 0] }, { duration: 0.35 });
    if (!muted) brrt();
    const vw = window.innerWidth, vh = window.innerHeight;
    const batch = Array.from({ length: 22 }, (_, k): Bill => ({
      id: ++burstId,
      x: rand(0.12, 0.62) * vw,
      y: rand(0.45, 0.85) * vh,
      up: rand(60, 220),
      spin: rand(-540, 540),
      flips: Math.round(rand(2, 5)),
      dur: rand(2.2, 3.4),
      delay: k * 0.035,
    }));
    setBills((b) => [...b, ...batch]);
    const ids = new Set(batch.map((b) => b.id));
    setTimeout(() => setBills((b) => b.filter((x) => !ids.has(x.id))), 3900);
  };

  return (
    <div className="relative">
      <Toy label="fire the money gun" onTap={fire}>
        <img ref={scope} src={f.src} alt={f.alt} draggable={false} className={figureImg} />
      </Toy>
      {/* cash leaves just past the barrel */}
      <div className="pointer-events-none absolute left-[48%] top-[45%] z-30">
        {bills.map((b) => (
          <motion.span
            key={b.id}
            className="absolute block"
            initial={{ x: 0, y: 0, rotate: 0, rotateX: 0, opacity: 1, scale: 0.6 }}
            animate={{
              x: [0, b.x * 0.35, b.x * 0.8, b.x],
              y: [0, -b.up, b.y * 0.5, b.y],
              rotate: [0, b.spin * 0.4, b.spin],
              rotateX: [0, 180 * b.flips],
              opacity: [1, 1, 1, 0],
              scale: [0.6, 1, 1, 0.95],
            }}
            transition={{ duration: b.dur, delay: b.delay, times: [0, 0.18, 0.6, 1], ease: "easeOut" }}
            style={{ transformPerspective: 400 }}
          >
            <CashBill />
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function CashBill() {
  return (
    <span className="grid h-[22px] w-[46px] place-items-center rounded-[2px] border border-[#3d6b3a] bg-[linear-gradient(135deg,#a9d39a,#7fb56f)] shadow-[0_2px_4px_rgb(0_0_0/.25)]">
      <span className="grid h-[14px] w-[14px] place-items-center rounded-full border border-[#3d6b3a]/70 bg-[#cfe8c4] font-typewriter text-[9px] leading-none text-[#2f5a2c]">$</span>
    </span>
  );
}

// ── lighter flick ─────────────────────────────────────────────────

function Lighter({ f, muted }: { f: Figure; muted: boolean }) {
  const [run, setRun] = useState(0);
  const busy = useRef(false);

  const flick = () => {
    if (busy.current) return;
    busy.current = true;
    if (!muted) tick(2400, 0.04);
    setRun((r) => r + 1);
    setTimeout(() => { busy.current = false; }, 2300);
  };

  return (
    <div className="relative">
      <Toy label="flick the lighter" onTap={flick}>
        <img src={f.src} alt={f.alt} draggable={false} className={figureImg} />
      </Toy>
      {/* flame at the torch lighter's nozzle */}
      <div className="pointer-events-none absolute left-[61%] top-[4%] z-30 w-[16%]">
        <AnimatePresence>{run > 0 && <Flame key={run} />}</AnimatePresence>
      </div>
    </div>
  );
}

function Flame() {
  const [stage, setStage] = useState<"lit" | "out">("lit");
  useEffect(() => { const t = setTimeout(() => setStage("out"), 1050); return () => clearTimeout(t); }, []);
  return (
    <div className="absolute bottom-0 left-1/2 w-full -translate-x-1/2">
      {/* sparks from the flint */}
      {[0, 1, 2, 3].map((i) => (
        <motion.span key={i} className="absolute bottom-0 left-1/2 block h-1 w-1 rounded-full bg-[#ffd25a]"
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: (i - 1.5) * 9, y: -10 - i * 4, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }} />
      ))}
      <AnimatePresence>
        {stage === "lit" && (
          <motion.svg key="flame" viewBox="0 0 20 34" className="relative block w-full overflow-visible" aria-hidden
            style={{ originX: 0.5, originY: 1 }}
            initial={{ scaleY: 0, scaleX: 0.6, opacity: 0 }}
            animate={{ scaleY: [0, 1.15, 0.92, 1.08, 0.95, 1.05, 1], scaleX: [0.6, 1, 0.95, 1.05, 0.97, 1, 1], opacity: 1 }}
            exit={{ scaleY: 0, scaleX: 0.4, opacity: 0, transition: { duration: 0.18, ease: ease.in } }}
            transition={{ duration: 1, times: [0, 0.12, 0.3, 0.5, 0.68, 0.85, 1] }}
          >
            <defs>
              <radialGradient id="flame" cx="50%" cy="78%" r="70%">
                <stop offset="0" stopColor="#fffbe6" />
                <stop offset=".3" stopColor="#ffd84d" />
                <stop offset=".65" stopColor="#ff8a1f" />
                <stop offset="1" stopColor="#e2401a" stopOpacity=".85" />
              </radialGradient>
            </defs>
            <path d="M10 1 C14 9 18 15 18 22 A8 8 0 0 1 2 22 C2 15 7 11 10 1 Z" fill="url(#flame)" style={{ filter: "drop-shadow(0 0 6px rgb(255 160 40 / .8))" }} />
            <ellipse cx="10" cy="29" rx="3.2" ry="2.2" fill="#4aa3ff" opacity=".8" />
          </motion.svg>
        )}
      </AnimatePresence>
      {stage === "out" && (
        <>
          {/* smoke puff */}
          <motion.span className="absolute bottom-[10%] left-1/2 block aspect-square w-[160%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(230_230_230/.85),rgb(200_200_200/0)_70%)]"
            initial={{ scale: 0.2, opacity: 0.9, y: 0 }}
            animate={{ scale: 1.8, opacity: 0, y: -30 }}
            transition={{ duration: 1.1, ease: "easeOut" }} />
          {/* my secret is no cigarette */}
          <motion.span className="absolute bottom-full left-1/2 block -translate-x-1/2 whitespace-nowrap font-hand text-2xl font-semibold text-ink drop-shadow-[0_1px_0_rgb(255_255_255/.8)]"
            initial={{ y: 6, opacity: 0, rotate: -6, scale: 0.8 }}
            animate={{ y: -22, opacity: [0, 1, 1, 0], rotate: -6, scale: 1 }}
            transition={{ duration: 1.2, times: [0, 0.15, 0.75, 1], ease: "easeOut" }}>
            nope.
          </motion.span>
        </>
      )}
    </div>
  );
}

// ── mints ─────────────────────────────────────────────────────────

type Mint = { id: number; dx: number; up: number; drop: number; spin: number; delay: number };

function Mints({ f, muted }: { f: Figure; muted: boolean }) {
  const [mints, setMints] = useState<Mint[]>([]);
  const [scope, animate] = useAnimate();

  const rattle = () => {
    if (scope.current) void animate(scope.current, { rotate: [0, -9, 8, -7, 6, -3, 0], x: [0, -3, 3, -2, 2, 0] }, { duration: 0.55 });
    if (!muted) [0, 70, 140, 210, 290].forEach((t) => setTimeout(() => tick(rand(1500, 2600), 0.03), t));
    const batch = Array.from({ length: 5 }, (_, k): Mint => ({
      // the tin sits near the right edge, so mints arc back toward the board
      id: ++burstId, dx: rand(-80, 25), up: rand(40, 90), drop: rand(30, 60), spin: rand(-360, 360), delay: 0.12 + k * 0.07,
    }));
    setMints((m) => [...m, ...batch]);
    const ids = new Set(batch.map((m) => m.id));
    setTimeout(() => setMints((m) => m.filter((x) => !ids.has(x.id))), 2200);
  };

  return (
    <div className="relative">
      <Toy label="rattle the mints" onTap={rattle}>
        <img ref={scope} src={f.src} alt={f.alt} draggable={false} className={figureImg} />
      </Toy>
      {/* mints pop out of the open end of the tin */}
      <div className="pointer-events-none absolute left-[86%] top-[22%] z-30">
        {mints.map((m) => (
          <motion.span
            key={m.id}
            className="absolute block h-[10px] w-[14px] rounded-[50%] bg-[radial-gradient(ellipse_at_35%_30%,#ffffff,#d6e6f2_60%,#a9c4d8)] shadow-[0_1px_2px_rgb(0_0_0/.3)]"
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
            // pop up, land, two little bounces, then fade
            animate={{
              x: [0, m.dx * 0.5, m.dx, m.dx * 1.15, m.dx * 1.25, m.dx * 1.3],
              y: [0, -m.up, m.drop, m.drop - 14, m.drop - 3, m.drop],
              rotate: [0, m.spin * 0.5, m.spin, m.spin, m.spin, m.spin],
              opacity: [0, 1, 1, 1, 1, 0],
            }}
            transition={{ duration: 1.5, delay: m.delay, times: [0, 0.25, 0.5, 0.65, 0.8, 1], ease: "easeOut" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── doll ──────────────────────────────────────────────────────────

/** Eye windows on the 421×600 doll image: each eye white (centre, radii) and its iris crop box, in px. */
const DOLL = { w: 421, h: 600 };
const EYES = [
  { key: "l", cx: 152.5, cy: 204.5, rx: 21, ry: 16.5, iris: [135, 184, 172, 221] },
  { key: "r", cx: 253.5, cy: 204.5, rx: 21, ry: 16.5, iris: [234, 183, 271, 220] },
] as const;
const IRIS_SIZE = 37; // iris crop size in doll pixels (stored at 3× for sharpness)

function Doll({ f }: { f: Figure }) {
  const root = useRef<HTMLDivElement>(null);
  const tx = useMotionValue(0), ty = useMotionValue(0);
  // eyes drift after the cursor slightly late, which is creepier than snapping
  const sx = useSpring(tx, { stiffness: 60, damping: 16 });
  const sy = useSpring(ty, { stiffness: 60, damping: 16 });
  // offsets are in doll pixels; % translate is relative to the iris image's own size
  const x = useTransform(sx, (p: number) => `${(p / IRIS_SIZE) * 100}%`);
  const y = useTransform(sy, (p: number) => `${(p / IRIS_SIZE) * 100}%`);
  const [blink, setBlink] = useState(0);

  useEffect(() => {
    const look = (e: PointerEvent) => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.34);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 300); // look fully sideways once the cursor is a little way off
      tx.set((dx / dist) * reach * 7.5);
      ty.set((dy / dist) * reach * 5);
    };
    window.addEventListener("pointermove", look);
    window.addEventListener("pointerdown", look);
    return () => { window.removeEventListener("pointermove", look); window.removeEventListener("pointerdown", look); };
  }, [tx, ty]);

  return (
    <Toy label="poke the doll" onTap={() => setBlink((b) => b + 1)}>
      <div ref={root} className="relative">
        <img src="/figures/doll-eyeless.webp" alt={f.alt} draggable={false} className={figureImg} />
        {EYES.map((e) => {
          const [x0, y0] = e.iris;
          const left = e.cx - e.rx, top = e.cy - e.ry, w = e.rx * 2, h = e.ry * 2;
          return (
            // each eye is a window onto its iris, so the iris can only move within the eye white
            <span
              key={e.key}
              className="absolute block overflow-hidden rounded-[50%]"
              style={{ left: `${(left / DOLL.w) * 100}%`, top: `${(top / DOLL.h) * 100}%`, width: `${(w / DOLL.w) * 100}%`, height: `${(h / DOLL.h) * 100}%` }}
            >
              <motion.img
                src={`/figures/doll-iris-${e.key}.webp`} alt="" draggable={false}
                className="absolute block h-auto max-w-none select-none"
                style={{ width: `${(IRIS_SIZE / w) * 100}%`, left: `${((x0 - left) / w) * 100}%`, top: `${((y0 - top) / h) * 100}%`, x, y }}
              />
              {/* poke it and it blinks at you */}
              {blink > 0 && (
                <motion.span
                  key={blink}
                  className="absolute inset-0 block origin-top bg-[#efc2a2]"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: [0, 1, 1, 0] }}
                  transition={{ duration: 0.32, times: [0, 0.35, 0.6, 1] }}
                />
              )}
            </span>
          );
        })}
      </div>
    </Toy>
  );
}

// ── tiny synthesized sounds ─────────────────────────────────────────

function audio() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctx();
}
function tick(freq: number, len: number) {
  try {
    const ctx = audio(), t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + len + 0.02);
    setTimeout(() => ctx.close(), 300);
  } catch { /* audio unavailable */ }
}
function brrt() {
  try {
    const ctx = audio(), t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    // fluttering paper: noise chopped into rapid bursts
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.sin(i / 90) > 0.2 ? 1 : 0.15) * (1 - i / len);
    const n = ctx.createBufferSource(), g = ctx.createGain(), filt = ctx.createBiquadFilter();
    filt.type = "bandpass"; filt.frequency.value = 2200; g.gain.value = 0.25;
    n.buffer = buf; n.connect(filt).connect(g).connect(ctx.destination); n.start(t);
    setTimeout(() => ctx.close(), 800);
  } catch { /* audio unavailable */ }
}

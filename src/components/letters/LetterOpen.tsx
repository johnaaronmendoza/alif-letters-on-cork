import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import { countdown, isLocked, type Letter, type Sticker } from "@/lib/letters";
import { LetterPaper } from "./LetterPaper";

export function LetterOpen({ letter, onClose }: { letter: Letter; onClose: () => void }) {
  const [stage, setStage] = useState<"sealed" | "cracked" | "open">("sealed");
  const [now, setNow] = useState(Date.now());
  const locked = isLocked(letter, now);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { window.removeEventListener("keydown", k); clearInterval(t); };
  }, [onClose]);

  const crack = () => {
    if (locked || stage !== "sealed") return;
    setStage("cracked");
    setTimeout(() => setStage("open"), 900);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button onClick={onClose} aria-label="close" className="fixed right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-cream text-ink shadow-item">
        <X className="h-5 w-5" />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="relative my-auto w-full max-w-xl">
        <AnimatePresence mode="wait">
          {stage !== "open" ? (
            <motion.div
              key="env"
              initial={{ scale: 0.3, rotate: letter.rotation, y: 80 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ y: 120, opacity: 0, transition: { duration: 0.35 } }}
              transition={{ type: "spring", stiffness: 160, damping: 18 }}
              className="relative mx-auto aspect-[4/3] w-full max-w-md paper-kraft shadow-paper"
              style={{ perspective: 800 }}
            >
              <motion.div
                className="absolute inset-x-0 top-0 h-[60%] origin-top"
                animate={stage === "cracked" ? { rotateX: 180 } : { rotateX: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full drop-shadow">
                  <path d="M0 0 L50 58 L100 0 Z" className="fill-kraft-dark" />
                </svg>
              </motion.div>
              <p className="absolute inset-x-0 bottom-6 text-center font-hand text-2xl text-ink">
                {letter.open_when_label ? `open when ${letter.open_when_label}` : `from ${letter.from_name}`}
              </p>
              <button
                onClick={crack}
                disabled={locked}
                className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2"
                aria-label={locked ? "locked" : "break the seal"}
              >
                {stage === "sealed" ? (
                  <motion.span
                    whileHover={locked ? {} : { scale: 1.1 }}
                    animate={locked ? {} : { rotate: [0, -4, 4, 0] }}
                    transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }}
                    className="grid h-20 w-20 place-items-center rounded-full text-3xl text-primary-foreground shadow-pin"
                    style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${letter.seal_color} 55%, white), ${letter.seal_color} 65%)` }}
                  >
                    {locked ? <Lock className="h-8 w-8" /> : letter.seal_symbol}
                  </motion.span>
                ) : (
                  <span className="relative block h-20 w-20">
                    {[-1, 1].map((d) => (
                      <motion.span
                        key={d}
                        initial={{ x: 0, rotate: 0, opacity: 1 }}
                        animate={{ x: d * 40, y: 30, rotate: d * 35, opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        className="absolute top-0 h-20 w-10 text-3xl"
                        style={{ left: d < 0 ? 0 : 40, background: letter.seal_color, borderRadius: d < 0 ? "40px 0 0 40px" : "0 40px 40px 0" }}
                      />
                    ))}
                  </span>
                )}
              </button>
              {locked && letter.unlock_at && (
                <div className="absolute inset-x-0 -bottom-20 text-center font-hand text-2xl text-cream">
                  opens in {countdown(letter.unlock_at, now)}
                  <div className="font-clean text-xs opacity-75">on {new Date(letter.unlock_at).toLocaleString()}</div>
                </div>
              )}
              {!locked && stage === "sealed" && (
                <p className="absolute inset-x-0 -bottom-12 text-center font-hand text-xl text-cream">tap the seal to open ♡</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="letter"
              initial={{ y: 140, scaleY: 0.2, opacity: 0 }}
              animate={{ y: 0, scaleY: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              style={{ transformOrigin: "top" }}
            >
              <LetterPaper data={{ ...letter, stickers: (letter.stickers as Sticker[]) ?? [] }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

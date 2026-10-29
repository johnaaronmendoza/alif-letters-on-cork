import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { fontClass, isLocked, paperKind, type Letter, type Sticker } from "@/lib/letters";
import { paperBg, useMedia } from "./LetterPaper";

export function Pin({ color }: { color: string }) {
  return (
    <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
      <span className="block h-4 w-4 rounded-full shadow-pin" style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${color} 40%, white), ${color} 60%)` }} />
    </span>
  );
}

export function BoardItem({ letter, isNew, onOpen }: { letter: Letter; isNew: boolean; onOpen: () => void }) {
  const kind = paperKind(letter.paper_style);
  const sticker = ((letter.stickers as Sticker[] | null) ?? [])[0]?.type ?? "♡";
  const locked = isLocked(letter);
  const photo = useMedia(kind === "polaroid" ? letter.photo_url : null);
  const useTape = letter.paper_style === "postcard" || letter.paper_style === "grid";

  return (
    <motion.button
      id={`letter-${letter.id}`}
      onClick={onOpen}
      initial={isNew ? { y: -500, opacity: 0, rotate: letter.rotation - 25 } : { opacity: 0, scale: 0.9 }}
      animate={isNew ? { y: 0, opacity: 1, rotate: [letter.rotation - 25, letter.rotation + 6, letter.rotation - 3, letter.rotation] } : { opacity: 1, scale: 1, rotate: letter.rotation }}
      transition={isNew ? { type: "spring", stiffness: 140, damping: 12, rotate: { duration: 1.1 } } : { duration: 0.4 }}
      whileHover={{ scale: 1.08, rotate: letter.rotation * 0.4, zIndex: 30 }}
      className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ left: `${letter.board_x}%`, top: `${letter.board_y}%`, width: kind === "postcard" ? "14%" : "11%", minWidth: kind === "postcard" ? 104 : 84 }}
      aria-label={`letter from ${letter.from_name}`}
    >
      {useTape ? (
        <span className="absolute -top-2 left-1/2 z-10 h-4 w-3/5 -translate-x-1/2 -rotate-3 opacity-85" style={{ background: letter.pin_color }} />
      ) : (
        <Pin color={letter.pin_color} />
      )}

      {kind === "envelope" && (
        <div className={`relative aspect-[4/3] w-full shadow-item ${paperBg[letter.paper_style]}`}>
          <svg viewBox="0 0 100 75" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <path d="M0 0 L50 42 L100 0" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="1.5" />
          </svg>
          <span className="absolute left-1/2 top-[48%] grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[10px] text-primary-foreground shadow-pin" style={{ background: letter.seal_color }}>{letter.seal_symbol}</span>
          <ItemLabel letter={letter} sticker={sticker} />
        </div>
      )}
      {kind === "polaroid" && (
        <div className="w-full bg-card p-1.5 pb-1 shadow-item">
          <div className="grid aspect-square w-full place-items-center overflow-hidden bg-muted text-3xl">
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : sticker}
          </div>
          <div className={`${fontClass(letter.font)} truncate py-1 text-center text-sm text-ink`}>from {letter.from_name}</div>
        </div>
      )}
      {kind === "postcard" && (
        <div className="relative aspect-[3/2] w-full paper-postcard shadow-item">
          <span className="absolute right-1.5 top-1.5 grid h-7 w-6 place-items-center border-2 border-dashed border-cherry bg-card text-xs">{sticker}</span>
          <div className="absolute inset-y-3 left-1/2 border-l border-ink/20" />
          <ItemLabel letter={letter} sticker="" />
        </div>
      )}
      {kind === "letter" && (
        <div className={`relative aspect-[3/4] w-full shadow-item ${paperBg[letter.paper_style]}`}>
          <div className="absolute inset-x-0 top-1/3 border-t border-ink/10" />
          <div className="absolute inset-x-0 top-2/3 border-t border-ink/10" />
          <ItemLabel letter={letter} sticker={sticker} />
        </div>
      )}

      {locked && (
        <span className="absolute -bottom-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-cream shadow-item"><Lock className="h-3.5 w-3.5" /></span>
      )}
    </motion.button>
  );
}

function ItemLabel({ letter, sticker }: { letter: Letter; sticker: string }) {
  return (
    <div className="absolute inset-x-1 bottom-1.5 flex items-end justify-between gap-1">
      <span className={`${fontClass(letter.font)} truncate text-left text-sm leading-tight sm:text-base`} style={{ color: letter.ink_color }}>from {letter.from_name}</span>
      {sticker && <span className="shrink-0 text-lg">{sticker}</span>}
    </div>
  );
}

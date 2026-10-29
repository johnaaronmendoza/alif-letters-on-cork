import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { PIN_ORIGIN, ease, spring } from "@/lib/motion";
import { envelopeFor, isLocked, jitter, type BoardSpot, type Letter } from "@/lib/letters";
import { isCanvasLetter } from "@/lib/canvas";
import { useMedia } from "./LetterPaper";

const PINS = ["#2bb3a3", "#f2c230", "#d9483b", "#a77bd6", "#d9483b"];
const pick = <T,>(list: T[], id: string, salt: number) => list[Math.floor((jitter(id, salt) + 1) * 2.5) % list.length]!;

/** A glossy push pin seen from slightly above. */
export function Pin({ color }: { color: string }) {
  return (
    <span className="pointer-events-none absolute -top-[9%] left-1/2 z-10 block w-[15%] min-w-3 -translate-x-1/2" aria-hidden>
      <svg viewBox="0 0 24 30" className="block w-full overflow-visible">
        <ellipse cx="14" cy="27" rx="5" ry="2" fill="rgb(40 20 5 / .35)" />
        <path d="M12 16 L13.5 27" stroke="#9a9a9a" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M6 9 Q12 13 18 9 L16.5 15 Q12 17.5 7.5 15 Z" fill={color} />
        <path d="M6 9 Q12 13 18 9 L16.5 15 Q12 17.5 7.5 15 Z" fill="rgb(0 0 0 / .18)" />
        <ellipse cx="12" cy="8" rx="7.5" ry="5" fill={color} />
        <ellipse cx="9.5" cy="6.5" rx="3" ry="1.7" fill="#fff" opacity=".55" />
      </svg>
    </span>
  );
}

export function BoardItem({
  letter, spot, boardHeight, isNew, index, onOpen,
}: {
  letter: Letter;
  spot: BoardSpot;
  /** Board height in % of the collage height. */
  boardHeight: number;
  isNew: boolean;
  /** Position in load order, used for the entrance stagger. */
  index: number;
  onOpen: (rect: DOMRect) => void;
}) {
  const photocard = isCanvasLetter(letter.stickers) && !!letter.photo_url;
  const photo = useMedia(photocard ? letter.photo_url : null);
  const locked = isLocked(letter);
  const env = envelopeFor(letter.id).name;
  const pin = pick(PINS, letter.id, 9);
  const r = spot.r;

  return (
    // Static wrapper owns placement + centering, so the animated child can't clobber it.
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 hover:z-30 focus-within:z-30"
      style={{ left: `${spot.x}%`, top: `${(spot.y / boardHeight) * 100}%`, width: photocard ? "9.5%" : "11%", minWidth: photocard ? 76 : 88 }}
    >
      <motion.button
        id={`letter-${letter.id}`}
        onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
        style={{ transformOrigin: PIN_ORIGIN }}
        initial={isNew ? { y: -220, opacity: 0, rotate: r - 12, scale: 1.05 } : { opacity: 0, y: 10, rotate: r, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, rotate: r, scale: 1 }}
        transition={isNew ? { ...spring.drop, opacity: { duration: 0.15 } } : { duration: 0.38, ease: ease.out, delay: Math.min(index, 24) * 0.04 }}
        whileHover={{ y: -6, scale: 1.05, rotate: r * 0.4, transition: spring.soft }}
        whileTap={{ scale: 0.97, transition: spring.snappy }}
        className="relative block w-full cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cork"
        aria-label={`${locked ? "locked " : ""}letter from ${letter.from_name}`}
      >
        {photocard && <Pin color={pin} />}

        {photocard ? (
          <div className="w-full bg-[#f6f4ef] p-[6%] pb-[4%] shadow-item">
            <div className="aspect-square w-full overflow-hidden bg-ink/10">
              {photo && <img src={photo} alt="" className="h-full w-full object-cover" draggable={false} />}
            </div>
            <div className="truncate pt-[6%] text-center font-clean text-[clamp(9px,1vw,13px)] font-semibold text-ink">{letter.from_name}</div>
          </div>
        ) : (
          <div className="relative w-full" style={{ aspectRatio: "600 / 457", filter: "drop-shadow(0 3px 5px rgb(40 25 10 / .25))" }}>
            <img src={`/board/envelopes/${env}.webp`} alt="" width={600} height={457} draggable={false} loading="lazy" className="block h-full w-full select-none" />
            <span className="absolute inset-x-[22%] top-[56%] -translate-y-1/2 truncate text-center font-clean text-[clamp(9px,1.05vw,15px)] font-semibold leading-tight text-ink">
              {letter.from_name}
            </span>
          </div>
        )}

        {locked && (
          <span className="absolute -bottom-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-cream shadow-item"><Lock className="h-3.5 w-3.5" /></span>
        )}
      </motion.button>
    </div>
  );
}

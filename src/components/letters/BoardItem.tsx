import { m } from "framer-motion";
import { Lock } from "lucide-react";
import { PIN_ORIGIN, ease, spring } from "@/lib/motion";
import { ENVELOPE_GEOM, envelopeFor, isLocked, type BoardSpot, type EnvelopeColor, type Letter } from "@/lib/letters";
import { isCanvasLetter, readCanvas } from "@/lib/canvas";
import { useMedia } from "./LetterPaper";


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
  letter, spot, boardHeight, isNew, index, read = false, flow = false, onOpen, onPrefetch,
}: {
  letter: Letter;
  spot: BoardSpot;
  /** Board height in % of the collage height. */
  boardHeight: number;
  isNew: boolean;
  /** Position in load order, used for the entrance stagger. */
  index: number;
  onOpen: (rect: DOMRect) => void;
  /** Phones: sit in a grid instead of being placed on the collage. */
  flow?: boolean;
  /** This viewer has opened it before: show it as an opened envelope. */
  read?: boolean;
  /** Called on hover / focus / press, to warm up what opening needs. */
  onPrefetch?: () => void;
}) {
  const photocard = isCanvasLetter(letter.stickers) && readCanvas(letter.stickers).photocard && !!letter.photo_url;
  const photo = useMedia(photocard ? letter.photo_url : null);
  const locked = isLocked(letter);
  const envColor = envelopeFor(letter.id);
  const env = envColor.name;
  const r = spot.r;

  return (
    // Static wrapper owns placement + centering, so the animated child can't clobber it.
    <div
      className={flow ? "relative z-10 hover:z-30 focus-within:z-30" : "absolute z-10 -translate-x-1/2 -translate-y-1/2 hover:z-30 focus-within:z-30"}
      // in the phone grid, every other column sits a little lower, so it reads as pinned, not tiled
      style={flow ? { marginTop: index % 2 ? "1.6rem" : 0 } : { left: `${spot.x}%`, top: `${(spot.y / boardHeight) * 100}%`, width: "11%", minWidth: 88 }}
    >
      <m.button
        id={`letter-${letter.id}`}
        onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
        onPointerEnter={onPrefetch}
        onPointerDown={onPrefetch}
        onFocus={onPrefetch}
        style={{ transformOrigin: PIN_ORIGIN }}
        initial={isNew ? { y: -220, opacity: 0, rotate: r - 12, scale: 1.05 } : { opacity: 0, y: 10, rotate: r, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, rotate: r, scale: 1 }}
        transition={isNew ? { ...spring.drop, opacity: { duration: 0.15 } } : { duration: 0.38, ease: ease.out, delay: Math.min(index, 24) * 0.04 }}
        whileHover={{ y: -6, scale: 1.05, rotate: r * 0.4, transition: spring.soft }}
        whileTap={{ scale: 0.97, transition: spring.snappy }}
        className="relative block w-full cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cork"
        aria-label={`${locked ? "locked " : ""}letter from ${letter.from_name}${photocard ? ", with a photocard" : ""}${read ? ", opened" : ""}`}
      >
          <div className="relative w-full" style={{ aspectRatio: "600 / 457", filter: "drop-shadow(0 3px 5px rgb(40 25 10 / .25))" }}>
            {/* a corner of the photocard peeking out from behind the envelope */}
            {photocard && (
              <span className="absolute -top-[16%] right-[7%] block w-[30%] rotate-[9deg] bg-[#fbfaf7] p-[3%] shadow-sm" aria-hidden>
                <span className="block aspect-[4/5] w-full overflow-hidden bg-ink/10">
                  {photo && <img src={photo} alt="" draggable={false} className="h-full w-full object-cover" />}
                </span>
              </span>
            )}
            {read ? (
              <OpenedEnvelope env={envColor} />
            ) : (
              <img src={`/board/envelopes/${env}.webp`} alt="" width={600} height={457} draggable={false} loading="lazy" className="relative block h-full w-full select-none" />
            )}
            <span className={`absolute inset-x-[16%] top-[56%] -translate-y-1/2 truncate text-center font-typewriter leading-tight text-ink ${flow ? "text-[clamp(10px,3.1vw,13px)]" : "text-[clamp(8px,0.82vw,12px)]"}`}>
              {letter.from_name}
            </span>
          </div>

        {locked && (
          <span className="absolute -bottom-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-cream shadow-item"><Lock className="h-3.5 w-3.5" /></span>
        )}
      </m.button>
    </div>
  );
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** An envelope that has been read: flap folded up, the letter peeking out of the pocket. */
function OpenedEnvelope({ env }: { env: EnvelopeColor }) {
  const g = ENVELOPE_GEOM;
  const layer = (part: "pocket" | "flap" | "pin") => `/board/envelopes/open/${env.name}-${part}.webp`;
  const img = "absolute inset-0 block h-full w-full select-none";
  return (
    <span className="relative block h-full w-full">
      {/* flap, folded up behind the envelope */}
      <img src={layer("flap")} alt="" draggable={false} loading="lazy" className={img}
        style={{ transform: "scaleY(-0.5)", transformOrigin: `50% ${pct(g.body.y, g.h)}`, filter: "brightness(.84)" }} />
      {/* inside of the envelope */}
      <span className="absolute block rounded-[2px]"
        style={{ left: pct(g.body.x, g.w), top: pct(g.body.y, g.h), width: pct(g.body.w, g.w), height: pct(g.body.h, g.h), background: `linear-gradient(180deg, ${env.inside}, ${env.shade})` }} />
      {/* the letter, peeking out */}
      <span className="absolute block shadow-[0_1px_2px_rgb(0_0_0/.15)]"
        style={{ left: "14%", width: "72%", top: "18%", height: "48%", backgroundColor: "#f8f3e7",
          backgroundImage: "repeating-linear-gradient(transparent 0 11%, rgb(90 120 170 / .14) 11% calc(11% + 1px))" }} />
      <img src={layer("pocket")} alt="" draggable={false} loading="lazy" className={img} />
      <img src={layer("pin")} alt="" draggable={false} loading="lazy" className={img} />
    </span>
  );
}

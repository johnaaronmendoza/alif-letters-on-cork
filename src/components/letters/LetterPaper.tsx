import { useEffect, useRef, useState } from "react";
import { fontClass, resolveMedia, type Sticker } from "@/lib/letters";

export type PaperData = {
  from_name: string;
  open_when_label: string;
  body: string;
  paper_style: string;
  font: string;
  ink_color: string;
  stickers: Sticker[];
  photo_url: string | null;
  signature_url: string | null;
};

export const paperBg: Record<string, string> = {
  lined: "paper-lined",
  kraft: "paper-kraft",
  airmail: "paper-airmail",
  polaroid: "paper-cream",
  postcard: "paper-postcard",
  grid: "paper-grid",
  pink: "paper-pink",
  cream: "paper-cream",
};

export function useMedia(ref: string | null, direct?: string | null) {
  const [url, setUrl] = useState<string | null>(direct ?? null);
  useEffect(() => {
    if (direct) return setUrl(direct);
    let on = true;
    resolveMedia(ref).then((u) => on && setUrl(u));
    return () => { on = false; };
  }, [ref, direct]);
  return url;
}

/** Full letter sheet. When onStickersChange is set, stickers are draggable. */
export function LetterPaper({
  data, photoPreview, signaturePreview, onStickersChange,
}: {
  data: PaperData;
  photoPreview?: string | null;
  signaturePreview?: string | null;
  onStickersChange?: (s: Sticker[]) => void;
}) {
  const photo = useMedia(data.photo_url, photoPreview);
  const sig = useMedia(data.signature_url, signaturePreview);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);

  const move = (e: React.PointerEvent) => {
    if (drag.current === null || !ref.current || !onStickersChange) return;
    const r = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(95, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(95, ((e.clientY - r.top) / r.height) * 100));
    onStickersChange(data.stickers.map((s, i) => (i === drag.current ? { ...s, x, y } : s)));
  };

  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
      className={`relative w-full overflow-hidden rounded-sm p-6 pb-10 shadow-paper sm:p-8 ${paperBg[data.paper_style] ?? "paper-cream"}`}
      style={{ color: data.ink_color, touchAction: onStickersChange ? "none" : undefined }}
    >
      {data.open_when_label && (
        <div className="mb-3 inline-block -rotate-2 bg-tape px-3 py-1 font-typewriter text-xs uppercase tracking-wider text-ink shadow-sm">
          open when {data.open_when_label}
        </div>
      )}
      {photo && (
        <div className="float-right ml-4 mb-2 w-28 rotate-3 bg-card p-1.5 pb-5 shadow-paper sm:w-36">
          <div className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 -rotate-6 bg-tape opacity-80" />
          <img src={photo} alt="attached photo" className="aspect-square w-full object-cover" />
        </div>
      )}
      <p className={`${fontClass(data.font)} min-h-32 whitespace-pre-wrap break-words text-xl leading-relaxed sm:text-2xl`}>
        {data.body || "dear alif,"}
      </p>
      <div className="mt-6 flex items-end justify-end gap-3">
        <div className="text-right">
          <div className={`${fontClass(data.font)} text-lg`}>— {data.from_name || "anonymous"}</div>
          {sig && <img src={sig} alt="signature" className="ml-auto h-14 object-contain" />}
        </div>
      </div>
      {data.stickers.map((s, i) => (
        <span
          key={i}
          onPointerDown={(e) => {
            if (!onStickersChange) return;
            e.preventDefault();
            drag.current = i;
          }}
          onDoubleClick={() => onStickersChange?.(data.stickers.filter((_, j) => j !== i))}
          className={`absolute select-none text-3xl drop-shadow ${onStickersChange ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `rotate(${s.rotation}deg) scale(${s.scale})` }}
        >
          {s.type}
        </span>
      ))}
    </div>
  );
}

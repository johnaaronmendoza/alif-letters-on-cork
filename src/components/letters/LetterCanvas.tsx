import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { Link2, Pause, Play, RotateCw } from "lucide-react";
import { CANVAS_FONTS, parseVideo, stickerSrc, type CanvasEl, type LegacyStickerName, type PaperId } from "@/lib/canvas";
import { PaperSheet } from "./Paper";
import { resolveMedia } from "@/lib/letters";
import { StickerArt } from "./stickers";

export type CanvasMode = "edit" | "view" | "thumb";

/** Resolves a stored media ref ("bucket/path") or passes through blob:/http URLs. */
export function useSrc(src: string | null | undefined) {
  const direct = src && /^(blob:|https?:|data:)/.test(src) ? src : null;
  const [url, setUrl] = useState<string | null>(direct);
  useEffect(() => {
    if (direct) return setUrl(direct);
    let on = true;
    resolveMedia(src ?? null).then((u) => on && setUrl(u));
    return () => { on = false; };
  }, [src, direct]);
  return url;
}

type Props = {
  elements: CanvasEl[];
  /** Which paper the letter is written on. */
  paper?: PaperId;
  mode: CanvasMode;
  selectedId?: string | null;
  editingId?: string | null;
  onSelect?: (id: string | null) => void;
  onEdit?: (id: string | null) => void;
  onChange?: (els: CanvasEl[]) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
};

export function LetterCanvas({ elements, paper: paperType = "lined", mode, selectedId, editingId, onSelect, onEdit, onChange, onGestureStart, onGestureEnd }: Props) {
  const paper = useRef<HTMLDivElement>(null);
  const gesture = useRef<null | {
    id: string; type: Gesture; px: number; py: number; wasSelected: boolean; moved: boolean;
    cx: number; cy: number; start: CanvasEl; dist: number; angle: number;
  }>(null);
  const editable = mode === "edit";
  const sorted = [...elements].sort((a, b) => a.z - b.z);

  const begin = (e: RPointerEvent, el: CanvasEl, type: Gesture) => {
    // while typing, the box can't be dragged around, but its handles still work
    if (!editable || (editingId === el.id && type === "move")) return;
    e.stopPropagation();
    if (type !== "move") e.preventDefault(); // keep focus (and the caret) in the text while using a handle
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const box = (e.currentTarget.closest("[data-el]") as HTMLElement).getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    gesture.current = {
      id: el.id, type, px: e.clientX, py: e.clientY, cx, cy, start: el, wasSelected: selectedId === el.id, moved: false,
      dist: Math.hypot(e.clientX - cx, e.clientY - cy) || 1,
      angle: Math.atan2(e.clientY - cy, e.clientX - cx),
    };
    onSelect?.(el.id);
    onGestureStart?.();
  };

  const move = (e: RPointerEvent) => {
    const g = gesture.current;
    if (!g || !paper.current || !onChange) return;
    const rect = paper.current.getBoundingClientRect();
    if (Math.hypot(e.clientX - g.px, e.clientY - g.py) > 5) g.moved = true;
    const s = g.start;
    let next: CanvasEl = s;
    if (g.type === "move") {
      const dx = ((e.clientX - g.px) / rect.width) * 100, dy = ((e.clientY - g.py) / rect.height) * 100;
      next = { ...s, x: clamp(s.x + dx, -s.w + 6, 94), y: clamp(s.y + dy, -s.h + 4, 96) };
    } else if (g.type === "width-r" || g.type === "width-l") {
      // text box width only: the text re-wraps, the font size stays the same
      const rad = (s.r * Math.PI) / 180;
      const along = (((e.clientX - g.px) * Math.cos(rad) + (e.clientY - g.py) * Math.sin(rad)) / rect.width) * 100;
      const w = clamp(g.type === "width-r" ? s.w + along : s.w - along, 8, 140);
      next = { ...s, w, x: g.type === "width-r" ? s.x : s.x + (s.w - w) };
    } else if (g.type === "resize") {
      const k = clamp(Math.hypot(e.clientX - g.cx, e.clientY - g.cy) / g.dist, 0.2, 6);
      const w = clamp(s.w * k, 6, 140), h = s.h * (w / s.w);
      next = (s.kind === "text"
        ? { ...s, w, x: s.x + s.w / 2 - w / 2, size: clamp(s.size * (w / s.w), 1.6, 20) }
        : { ...s, w, h, x: s.x + s.w / 2 - w / 2, y: s.y + s.h / 2 - h / 2 }) as CanvasEl;
    } else {
      let r = s.r + ((Math.atan2(e.clientY - g.cy, e.clientX - g.cx) - g.angle) * 180) / Math.PI;
      r = ((r + 540) % 360) - 180;
      if (Math.abs(r) < 3) r = 0; // snap straight
      next = { ...s, r };
    }
    onChange(elements.map((x) => (x.id === g.id ? next : x)));
  };

  const end = () => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    onGestureEnd?.();
    // tapping a text box that's already selected starts typing (double-tap is unreliable on phones)
    if (g.type === "move" && !g.moved && g.wasSelected && g.start.kind === "text") onEdit?.(g.id);
  };

  return (
    <div className="relative w-full" style={{ filter: mode === "thumb" ? "drop-shadow(0 2px 3px rgb(40 25 10 / .3))" : "drop-shadow(0 10px 24px rgb(40 25 10 / .25))" }}>
      <div
        ref={paper}
        onPointerMove={editable ? move : undefined}
        onPointerUp={editable ? end : undefined}
        onPointerCancel={editable ? end : undefined}
        onPointerDown={editable ? () => { onSelect?.(null); onEdit?.(null); } : undefined}
        // In the editor, elements may hang off the edge so their handles stay reachable.
        className={`relative aspect-[3/4] w-full select-none ${editable ? "" : "overflow-hidden"}`}
        style={{ containerType: "inline-size", touchAction: editable ? "none" : undefined }}
      >
        <PaperSheet paper={paperType} />
        {sorted.map((el) => {
          const selected = editable && selectedId === el.id;
          return (
            <div
              key={el.id}
              data-el
              onPointerDown={(e) => begin(e, el, "move")}
              onDoubleClick={() => editable && el.kind === "text" && onEdit?.(el.id)}
              className={`absolute ${editable ? "cursor-move" : ""}`}
              style={{
                left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`,
                height: el.kind === "text" ? "auto" : `${el.h}%`,
                transform: `rotate(${el.r}deg)`,
                zIndex: el.z,
              }}
            >
              <ElementView el={el} mode={mode} editing={editingId === el.id} onText={(text) => onChange?.(elements.map((x) => (x.id === el.id ? { ...x, text } as CanvasEl : x)))} onDoneEditing={() => onEdit?.(null)} />
              {selected && (
                <>
                  <div className="pointer-events-none absolute -inset-1 border-[1.5px] border-[#3b82f6]" />
                  <button
                    aria-label="rotate"
                    onPointerDown={(e) => begin(e, el, "rotate")}
                    className="absolute -top-12 left-1/2 grid h-10 w-10 -translate-x-1/2 cursor-grab place-items-center rounded-full border border-black/10 bg-white text-ink shadow-md"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  {el.kind === "text" && (["width-l", "width-r"] as const).map((side) => (
                    <button
                      key={side}
                      aria-label={side === "width-r" ? "make wider or narrower from the right" : "make wider or narrower from the left"}
                      onPointerDown={(e) => begin(e, el, side)}
                      className={`absolute top-1/2 grid h-11 w-9 -translate-y-1/2 cursor-ew-resize place-items-center ${side === "width-r" ? "-right-5" : "-left-5"}`}
                    >
                      <span className="block h-6 w-2.5 rounded-full border-2 border-[#3b82f6] bg-white shadow" />
                    </button>
                  ))}
                  <button
                    aria-label="resize"
                    onPointerDown={(e) => begin(e, el, "resize")}
                    className="absolute -bottom-5 -right-5 grid h-10 w-10 cursor-nwse-resize place-items-center"
                  >
                    <span className="block h-6 w-6 rounded-full border-2 border-[#3b82f6] bg-white shadow" />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
type Gesture = "move" | "resize" | "rotate" | "width-l" | "width-r";

export function fontCls(id: string) {
  return CANVAS_FONTS.find((f) => f.id === id)?.cls ?? "font-hand";
}

function ElementView({ el, mode, editing, onText, onDoneEditing }: {
  el: CanvasEl; mode: CanvasMode; editing: boolean; onText: (t: string) => void; onDoneEditing: () => void;
}) {
  const live = mode === "view";
  switch (el.kind) {
    case "text": {
      const style = {
        color: el.color, fontSize: `${el.size}cqw`, lineHeight: 1.25,
        background: el.bg ?? "transparent", padding: el.bg ? "0.25em 0.5em" : "0.1em 0.15em", borderRadius: el.bg ? "0.3em" : 0,
      };
      return editing ? (
        <AutoTextarea
          value={el.text}
          maxLength={1000}
          placeholder="write something…"
          onChange={onText}
          onBlur={onDoneEditing}
          className={`${fontCls(el.font)} block w-full resize-none overflow-hidden whitespace-pre-wrap break-words border-0 outline-none`}
          style={style}
        />
      ) : (
        <div className={`${fontCls(el.font)} whitespace-pre-wrap break-words`} style={style}>{el.text || " "}</div>
      );
    }
    case "link": {
      const inner = (
        <span className="flex h-full w-full items-center justify-center gap-[0.4em] overflow-hidden rounded-[0.5em] bg-[#2b2b2b] px-[0.6em] font-clean font-medium text-white" style={{ fontSize: "2.6cqw" }}>
          <Link2 className="h-[1.1em] w-[1.1em] shrink-0" />
          <span className="truncate">{el.label || el.url.replace(/^https?:\/\//, "")}</span>
        </span>
      );
      return live ? (
        <a href={el.url} target="_blank" rel="noopener noreferrer nofollow" className="block h-full w-full">{inner}</a>
      ) : inner;
    }
    case "image":
      return <ImageView src={el.src} sticker={el.sticker} rounded={el.rounded} />;
    case "audio":
      return <AudioView src={el.src} name={el.name} live={live} />;
    case "video":
      return <VideoView url={el.url} live={live} />;
    case "sticker":
      return <StickerView name={el.name} photo={el.photo} />;
  }
}

/** White die-cut edge that follows the picture's shape (stacked hard shadows), plus a soft drop shadow. */
const DIE_CUT = ([
  [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7],
] as [number, number][]).map(([x, y]) => `drop-shadow(${x * 0.55}cqw ${y * 0.55}cqw 0 #fff)`).join(" ") + " drop-shadow(0 0.6cqw 0.8cqw rgb(40 25 10 / .35))";

function ImageView({ src, sticker, rounded }: { src: string; sticker?: boolean; rounded?: boolean }) {
  const url = useSrc(src);
  if (!url) return <div className="h-full w-full animate-pulse bg-ink/10" />;
  if (sticker)
    return <img src={url} alt="" draggable={false} className={`h-full w-full object-contain ${rounded ? "rounded-[10%]" : ""}`} style={{ filter: DIE_CUT }} />;
  return <img src={url} alt="" draggable={false} className="h-full w-full object-cover shadow-sm" />;
}

function StickerView({ name, photo }: { name: string; photo?: string | null }) {
  const url = useSrc(photo);
  const src = stickerSrc(name);
  if (src) return <img src={src} alt="" draggable={false} className="h-full w-full select-none object-contain" />;
  return <div className="relative h-full w-full"><StickerArt name={name as LegacyStickerName} photo={url} /></div>;
}

function AudioView({ src, name, live }: { src: string; name: string; live: boolean }) {
  const url = useSrc(src);
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  return (
    <div className="flex h-full w-full items-center gap-[4%] rounded-full bg-[#6e6e6e] px-[5%] text-white shadow-sm" style={{ fontSize: "2.4cqw" }}>
      <button
        type="button"
        aria-label={playing ? "pause" : "play"}
        disabled={!live || !url}
        onPointerDown={(e) => live && e.stopPropagation()}
        onClick={() => { const a = ref.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); }}
        className="grid aspect-square h-[70%] shrink-0 place-items-center rounded-full bg-white text-[#3a3a3a] disabled:cursor-default"
      >
        {playing ? <Pause className="h-[45%] w-[45%]" /> : <Play className="ml-[8%] h-[45%] w-[45%]" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate font-clean">{name || "voice note"}</div>
        <div className="mt-[3%] h-[0.35em] w-full rounded-full bg-white/30"><div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></div>
      </div>
      {live && url && (
        <audio
          ref={ref} src={url} preload="metadata"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(0); }}
          onTimeUpdate={(e) => { const a = e.currentTarget; setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0); }}
        />
      )}
    </div>
  );
}

function VideoView({ url, live }: { url: string; live: boolean }) {
  const v = parseVideo(url);
  if (live && v?.type === "iframe")
    return <iframe src={v.src} title="video" className="h-full w-full rounded-[2%] bg-black" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />;
  if (live && v?.type === "file")
    return <video src={v.src} controls playsInline className="h-full w-full rounded-[2%] bg-black object-contain" />;
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-[2%] bg-[#1b1b1b]">
      {v?.thumb && <img src={v.thumb} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-90" />}
      <span className="relative grid aspect-square w-[22%] place-items-center rounded-full bg-white/90 text-ink shadow"><Play className="ml-[8%] h-1/2 w-1/2" /></span>
      {!v && <span className="absolute inset-x-[6%] bottom-[6%] truncate text-center font-clean text-white/80" style={{ fontSize: "2cqw" }}>{url}</span>}
    </div>
  );
}

/** Textarea that grows to fit its text, including lines that wrap on their own. */
function AutoTextarea({ value, onChange, onBlur, placeholder, maxLength, className, style }: {
  value: string; onChange: (v: string) => void; onBlur: () => void; placeholder?: string; maxLength?: number;
  className?: string; style?: CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = ref.current;
    if (t) t.setSelectionRange(t.value.length, t.value.length);
  }, []);
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight}px`;
  });
  return (
    <textarea
      ref={ref}
      autoFocus
      rows={1}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onPointerDown={(e) => e.stopPropagation()}
      className={className}
      style={style}
    />
  );
}

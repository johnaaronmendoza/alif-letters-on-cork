import type { CSSProperties, ReactNode } from "react";
import type { LegacyStickerName } from "@/lib/canvas";

/** Photo well used inside frame stickers. */
function Slot({ photo, className = "", style }: { photo?: string | null; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`overflow-hidden bg-white ${className}`}
      style={{ ...style, backgroundImage: photo ? `url("${photo}")` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
    />
  );
}

const fill = "absolute inset-0 h-full w-full";
const svg = (viewBox: string, children: ReactNode) => (
  <svg viewBox={viewBox} className={fill} preserveAspectRatio="none" aria-hidden>{children}</svg>
);
const torn = (w: number, h: number, seed: number) => {
  // irregular torn top edge, flat bottom
  const pts: string[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const x = (w / steps) * i;
    const y = h * 0.38 - (i / steps) * h * 0.3 + Math.sin(i * 1.7 + seed) * h * 0.06;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M0,${h} L${pts.join(" L")} L${w},${h} Z`;
};

/** The original drawn stickers, kept so letters that already use them still render. */
export function StickerArt({ name, photo }: { name: LegacyStickerName; photo?: string | null }) {
  switch (name) {
    case "note-tape":
      return svg("0 0 100 92", <>
        <rect x="4" y="10" width="92" height="80" fill="#f4efdf" />
        <rect x="4" y="10" width="92" height="80" fill="url(#ng)" opacity=".5" />
        <defs><linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#e3dcc5" /></linearGradient></defs>
        <rect x="30" y="2" width="40" height="15" fill="#e7a8b0" opacity=".85" transform="rotate(-3 50 9)" />
      </>);
    case "note-clip":
      return svg("0 0 100 80", <>
        <path d="M3 8 L97 4 L95 76 L5 78 Z" fill="#ebe3d1" />
        <path d="M3 8 L97 4 L95 76 L5 78 Z" fill="none" stroke="#d6ccb4" strokeWidth=".8" />
        <path d="M20 30 L80 26 M18 44 L84 42 M22 58 L70 57" stroke="#ddd3bd" strokeWidth=".6" />
        <path d="M68 -2 v22 a5 5 0 0 0 10 0 v-18 a3 3 0 0 0 -6 0 v16" fill="none" stroke="#9aa0a8" strokeWidth="2" strokeLinecap="round" />
      </>);
    case "ticket":
      return svg("0 0 100 50", <>
        <path d="M2 4 H98 V18 a6 6 0 0 0 0 14 V46 H2 V32 a6 6 0 0 0 0 -14 Z" fill="#f2e6d3" />
        <rect x="12" y="12" width="76" height="26" rx="3" fill="none" stroke="#d26a5c" strokeWidth="1.6" />
      </>);
    case "torn-kraft":
      return svg("0 0 100 42", <path d={torn(100, 42, 1)} fill="#c8a57c" />);
    case "kraft-hearts":
      return svg("0 0 100 50", <>
        <path d="M6 10 Q30 2 52 8 T96 6 L94 44 Q70 50 48 44 T4 46 Z" fill="#a9784b" />
        {[24, 50, 76].map((cx) => (
          <path key={cx} d={`M${cx} 34 C${cx - 14} 24 ${cx - 9} 12 ${cx} 20 C${cx + 9} 12 ${cx + 14} 24 ${cx} 34 Z`} fill="none" stroke="#3a2412" strokeWidth="1.8" />
        ))}
      </>);
    case "i-love-you":
      return (
        <div className={`${fill} flex items-center justify-center bg-[#ece7dc] shadow-sm`} style={{ containerType: "inline-size" }}>
          <span className="font-typewriter text-ink" style={{ fontSize: "17cqw" }}>I love you</span>
        </div>
      );
    case "popup":
      return (
        <div className={`${fill} flex flex-col overflow-hidden rounded-[8%] bg-[#f1efed] p-[7%]`} style={{ containerType: "inline-size" }}>
          <div className="rounded-t-[6cqw] bg-[#b3b3b3] px-[6%] py-[7%] text-center text-[#222]">
            <div className="font-clean font-semibold" style={{ fontSize: "8cqw" }}>Incoming</div>
            <div className="font-clean" style={{ fontSize: "4.5cqw" }}>would like to share a photo</div>
          </div>
          <Slot photo={photo} className="flex-1" />
          <div className="grid grid-cols-2 rounded-b-[6cqw] bg-[#b3b3b3] text-center font-clean text-[#222]" style={{ fontSize: "5.5cqw" }}>
            <span className="border-r border-black/15 py-[8%]">Decline</span>
            <span className="py-[8%]">Accept</span>
          </div>
        </div>
      );
    case "browser":
      return (
        <div className={`${fill} flex flex-col overflow-hidden rounded-[3%] border border-black/10 bg-white`}>
          <div className="flex h-[9%] items-center gap-[2%] bg-[#ececec] px-[3%]">
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} className="aspect-square h-[45%] rounded-full" style={{ background: c }} />)}
          </div>
          <Slot photo={photo} className="flex-1" />
          <div className="flex h-[9%] items-center justify-center bg-[#ececec]">
            <span className="aspect-square h-[55%] rounded-full bg-[#e5332a]" />
          </div>
        </div>
      );
    case "player":
      return (
        <div className={`${fill} flex flex-col gap-[5%] rounded-[8%] bg-[#6e6e6e] p-[8%]`}>
          <Slot photo={photo} className="aspect-square w-full rounded-[6%]" />
          <div className="mt-[4%] h-[1.5%] w-full rounded-full bg-white/30"><div className="h-full w-[40%] rounded-full bg-white" /></div>
          <div className="flex flex-1 items-center justify-center gap-[14%] text-white">
            <svg viewBox="0 0 24 24" className="w-[16%]" fill="currentColor" aria-hidden><path d="M11 6v12L2 12zM22 6v12l-9-6z" /></svg>
            <svg viewBox="0 0 24 24" className="w-[18%]" fill="currentColor" aria-hidden><path d="M6 4l14 8-14 8z" /></svg>
            <svg viewBox="0 0 24 24" className="w-[16%]" fill="currentColor" aria-hidden><path d="M13 6v12l9-6zM2 6v12l9-6z" /></svg>
          </div>
        </div>
      );
    case "tv":
      return (
        <div className={`${fill} flex gap-[4%] rounded-[6%] bg-gradient-to-b from-[#4a4540] to-[#2b2724] p-[5%] shadow-inner`}>
          <div className="flex-[3] rounded-[14%] bg-[#151311] p-[4%]">
            <Slot photo={photo} className="h-full w-full rounded-[12%]" style={{ boxShadow: "inset 0 0 12px rgb(0 0 0 / .35)" }} />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-[10%] rounded-[8%] bg-[#3a3632] py-[8%]">
            {[0, 1].map((i) => <span key={i} className="aspect-square w-[60%] rounded-full border-2 border-[#8d8780] bg-[#1e1b19]" />)}
            <span className="h-[20%] w-[60%] bg-[repeating-linear-gradient(0deg,#1e1b19_0_2px,transparent_2px_4px)]" />
          </div>
        </div>
      );
    case "film-frame":
      return (
        <div className={`${fill} flex flex-col bg-[#111] px-[6%]`} style={{ containerType: "inline-size" }}>
          <Sprockets />
          <div className="flex justify-between px-[4%] font-clean font-semibold text-[#f2a33a]" style={{ fontSize: "5cqw" }}><span>FILM 400</span><span>21</span></div>
          <Slot photo={photo} className="my-[3%] flex-1" />
          <div className="flex justify-between px-[4%] font-clean font-semibold text-[#f2a33a]" style={{ fontSize: "5cqw" }}><span>▷20A</span><span>21</span></div>
          <Sprockets />
        </div>
      );
    case "film-strip":
      return (
        <div className={`${fill} flex flex-col bg-[#111] px-[1.5%]`}>
          <Sprockets dense />
          <div className="flex flex-1 gap-[1.5%] py-[2%]">
            {[0, 1, 2].map((i) => <Slot key={i} photo={photo} className="flex-1" />)}
          </div>
          <Sprockets dense />
        </div>
      );
    case "heart":
      return svg("0 0 24 24", <path d="M12 21s-7.5-4.6-9.5-9.2C1 8.4 3.2 4.5 7 4.5c2.2 0 3.6 1.3 5 3 1.4-1.7 2.8-3 5-3 3.8 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z" fill="#e2404f" stroke="#a61f2d" strokeWidth=".8" />);
    case "star":
      return svg("0 0 24 24", <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" fill="#f6d44a" stroke="#c89b12" strokeWidth=".8" strokeLinejoin="round" />);
    case "cherry":
      return svg("0 0 24 24", <>
        <path d="M8 15c1-5 4-9 9-12M16 16c0-5 0-9 1-13" stroke="#3f6b2a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <circle cx="7.5" cy="17" r="4" fill="#d7263d" /><circle cx="16" cy="18" r="4" fill="#c21c33" />
        <circle cx="6.2" cy="15.6" r="1" fill="#fff" opacity=".6" />
      </>);
    case "tulip":
      return svg("0 0 24 24", <>
        <path d="M12 12v10M12 18c-3-1-5-3-5-5M12 17c3-1 4-3 4-4" stroke="#3f7a34" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M7 5c0 5 2 7 5 7s5-2 5-7l-2.5 2L12 3 9.5 7z" fill="#f08aa6" stroke="#c4526f" strokeWidth=".7" strokeLinejoin="round" />
      </>);
    case "bow":
      return svg("0 0 24 24", <>
        <path d="M12 11C9 6 3 5 3 9s5 5 9 2zM12 11c3-5 9-6 9-2s-5 5-9 2z" fill="#f4a0b5" stroke="#c4526f" strokeWidth=".8" />
        <path d="M11 12l-3 9 2-1 1 2 1-9M13 12l3 9-2-1-1 2-1-9" fill="#f4a0b5" stroke="#c4526f" strokeWidth=".7" />
        <circle cx="12" cy="11" r="1.8" fill="#e27a97" />
      </>);
    case "moon":
      return svg("0 0 24 24", <path d="M15.5 3a9 9 0 1 0 5.5 15.4A8 8 0 0 1 15.5 3z" fill="#f6e27a" stroke="#c9a93a" strokeWidth=".8" />);
    default:
      return null;
  }
}

function Sprockets({ dense = false }: { dense?: boolean }) {
  const n = dense ? 22 : 8;
  return (
    <div className="flex h-[9%] items-center justify-between py-[1.5%]">
      {Array.from({ length: n }, (_, i) => <span key={i} className="h-full rounded-[2px] bg-white/95" style={{ width: dense ? "2.6%" : "7%" }} />)}
    </div>
  );
}

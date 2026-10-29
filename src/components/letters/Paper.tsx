import type { CSSProperties } from "react";
import type { PaperId } from "@/lib/canvas";

/**
 * Paper for the letter. Rendered inside an element with `container-type: inline-size`,
 * so `cqw` sizes scale with the sheet (a sidebar swatch is a true miniature).
 */

// fine paper grain, multiplied over every sheet
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .3 0 0 0 0 .22 0 0 0 .16 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";
// long paper fibres, for kraft
const FIBRES =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.012 .5' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .25 0 0 0 0 .16 0 0 0 0 .06 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E\")";

/** Ragged edges: torn top and bottom only, or deckled on all four sides. */
function roughEdges(all: boolean, seed: number) {
  const n = 44, r = (i: number, k: number) => Math.abs(Math.sin(i * k + seed));
  const top: string[] = [], right: string[] = [], bottom: string[] = [], left: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 100;
    top.push(`${t.toFixed(2)}% ${(0.5 + r(i, 2.3) * 1.1).toFixed(2)}%`);
    bottom.unshift(`${t.toFixed(2)}% ${(99.5 - r(i, 1.9) * 1.1).toFixed(2)}%`);
    if (all) {
      right.push(`${(99.3 - r(i, 2.9) * 0.9).toFixed(2)}% ${t.toFixed(2)}%`);
      left.unshift(`${(0.7 + r(i, 1.7) * 0.9).toFixed(2)}% ${t.toFixed(2)}%`);
    }
  }
  return `polygon(${[...top, ...right, ...bottom, ...left].join(",")})`;
}
const TORN = roughEdges(false, 0);
const DECKLE = roughEdges(true, 0.7);

type Sheet = { base: CSSProperties; clip?: string; radius?: string; mask?: CSSProperties; extra?: "airmail" | "holes-shadow" };

const SHEETS: Record<PaperId, Sheet> = {
  lined: {
    clip: TORN,
    base: {
      backgroundColor: "#fdfcf8",
      backgroundImage: "linear-gradient(to bottom, transparent calc(100% - 1px), rgb(90 130 190 / .2) calc(100% - 1px))",
      backgroundSize: "100% 4.6cqw",
      backgroundPosition: "0 8cqw",
    },
  },
  notebook: {
    radius: "0.6cqw",
    base: {
      backgroundColor: "#fefdf9",
      backgroundImage: [
        "linear-gradient(90deg, transparent 13cqw, rgb(214 64 74 / .55) 13cqw, rgb(214 64 74 / .55) calc(13cqw + 1.5px), transparent calc(13cqw + 1.5px))",
        "linear-gradient(to bottom, transparent calc(100% - 1px), rgb(90 130 190 / .22) calc(100% - 1px))",
      ].join(","),
      backgroundSize: "100% 100%, 100% 4.6cqw",
      backgroundPosition: "0 0, 0 12cqw",
      backgroundRepeat: "no-repeat, repeat-y",
    },
    // three punched holes down the left
    mask: {
      maskImage: "radial-gradient(circle at 6cqw 50%, transparent 1.7cqw, #000 calc(1.7cqw + 1px))",
      maskSize: "100% 33.333%",
      maskRepeat: "repeat-y",
      WebkitMaskImage: "radial-gradient(circle at 6cqw 50%, transparent 1.7cqw, #000 calc(1.7cqw + 1px))",
      WebkitMaskSize: "100% 33.333%",
      WebkitMaskRepeat: "repeat-y",
    },
  },
  plain: {
    clip: TORN,
    base: { backgroundColor: "#fbf7ee", backgroundImage: "radial-gradient(ellipse at 50% 40%, rgb(255 255 255 / .6), transparent 70%)" },
  },
  grid: {
    radius: "0.4cqw",
    base: {
      backgroundColor: "#fdfdfa",
      backgroundImage: "linear-gradient(rgb(80 130 190 / .18) 1px, transparent 1px), linear-gradient(90deg, rgb(80 130 190 / .18) 1px, transparent 1px)",
      backgroundSize: "4.4cqw 4.4cqw",
      backgroundPosition: "-1px -1px",
    },
  },
  dotted: {
    radius: "2.4cqw",
    base: {
      backgroundColor: "#fbfaf5",
      backgroundImage: "radial-gradient(circle, rgb(40 40 40 / .26) 0.3cqw, transparent calc(0.3cqw + 0.5px))",
      backgroundSize: "4.6cqw 4.6cqw",
      backgroundPosition: "2.3cqw 2.3cqw",
    },
  },
  kraft: {
    clip: DECKLE,
    base: { backgroundColor: "#c9a679", backgroundImage: `${FIBRES}, radial-gradient(ellipse at 50% 45%, rgb(255 235 200 / .18), transparent 70%)` },
  },
  vintage: {
    clip: DECKLE,
    base: {
      backgroundColor: "#efe2c3",
      backgroundImage: [
        "radial-gradient(circle at 80% 14%, rgb(150 105 45 / .17), transparent 20%)",
        "radial-gradient(circle at 18% 82%, rgb(140 95 40 / .14), transparent 24%)",
        "radial-gradient(circle at 70% 70%, rgb(150 110 50 / .08), transparent 14%)",
        "radial-gradient(ellipse at center, transparent 52%, rgb(120 78 30 / .3) 100%)",
      ].join(","),
    },
  },
  pink: {
    radius: "1cqw",
    base: {
      backgroundColor: "#f8dfe2",
      backgroundImage: "radial-gradient(circle, rgb(255 255 255 / .75) 0.35cqw, transparent calc(0.35cqw + 0.5px))",
      backgroundSize: "3.6cqw 3.6cqw",
    },
  },
  airmail: {
    radius: "0.6cqw",
    extra: "airmail",
    base: {
      backgroundImage: "repeating-linear-gradient(-45deg, #d23b3b 0 2.6cqw, #fdfcf7 2.6cqw 3.8cqw, #2f5ea8 3.8cqw 6.4cqw, #fdfcf7 6.4cqw 7.6cqw)",
    },
  },
};

export function PaperSheet({ paper }: { paper: PaperId }) {
  const s = SHEETS[paper] ?? SHEETS.lined;
  const shape: CSSProperties = { clipPath: s.clip, borderRadius: s.radius, ...s.mask };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={shape}>
      <div className="absolute inset-0" style={s.base} />
      {s.extra === "airmail" && (
        <div className="absolute inset-[3.2cqw] rounded-[0.3cqw] bg-[#fdfcf7]"
          style={{ backgroundImage: "linear-gradient(to bottom, transparent calc(100% - 1px), rgb(90 130 190 / .14) calc(100% - 1px))", backgroundSize: "100% 4.6cqw" }} />
      )}
      {/* grain over everything, slightly stronger on kraft and vintage */}
      <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: GRAIN, opacity: paper === "kraft" || paper === "vintage" ? 1 : 0.7 }} />
    </div>
  );
}

/** A tiny sheet for the sidebar picker. */
export function PaperSwatch({ paper }: { paper: PaperId }) {
  return (
    <span className="relative block aspect-[3/4] w-full" style={{ containerType: "inline-size", filter: "drop-shadow(0 1px 2px rgb(40 25 10 / .25))" }}>
      <PaperSheet paper={paper} />
    </span>
  );
}

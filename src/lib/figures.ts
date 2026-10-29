/**
 * Wall decorations around the corkboard. Swap `src` for your own cut-out PNGs
 * (put them in /public/figures). x/y are % of the room; rotation in degrees.
 */
export type Figure = { src: string; x: number; y: number; rotation: number; scale: number; alt: string };

export const FIGURES: Figure[] = [
  { src: "/figures/placeholder-1.svg", x: 2.5, y: 46, rotation: -4, scale: 1, alt: "figure on the shelf" },
  { src: "/figures/placeholder-2.svg", x: 6.5, y: 48, rotation: 5, scale: 0.8, alt: "figure on the shelf" },
  { src: "/figures/placeholder-3.svg", x: 70, y: 4.5, rotation: 3, scale: 0.75, alt: "figure on the frame" },
  { src: "/figures/placeholder-4.svg", x: 88, y: 82, rotation: -10, scale: 0.9, alt: "figure peeking" },
  { src: "/figures/placeholder-5.svg", x: 93, y: 40, rotation: 6, scale: 0.7, alt: "figure on the wall" },
];

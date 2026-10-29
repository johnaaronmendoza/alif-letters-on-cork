/**
 * Figures that sit around the corkboard. Images live in /public/figures.
 * x: horizontal position of the figure's base, in % of the page width
 *    (the board itself spans roughly 10%–90%).
 * y: where the base rests, as CSS from the top of the board — px for things
 *    sitting on the top frame (so they stay put as the board grows), % otherwise.
 * w: width in % of the page width. rotation in degrees.
 */
export type Figure = { src: string; alt: string; x: number; y: string; w: number; rotation: number };

export const FIGURES: Figure[] = [
  { src: "/figures/mints.webp", alt: "a tin of Eclipse mints", x: 33, y: "14px", w: 8.5, rotation: -6 },
  { src: "/figures/money-gun.webp", alt: "a money gun spraying cash", x: 74, y: "12px", w: 8, rotation: -8 },
  { src: "/figures/cigarettes.webp", alt: "a pack of Gudang Garam with a lighter", x: 91.5, y: "42%", w: 7, rotation: 7 },
  { src: "/figures/doll.webp", alt: "a little doll figure", x: 12, y: "calc(100% - 10px)", w: 8, rotation: 0 },
];

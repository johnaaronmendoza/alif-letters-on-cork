/**
 * Figures that sit on the corners of the corkboard. Images live in /public/figures.
 * Positions are relative to the board (frame included):
 * x: where the figure's base is, in % of the board width (0 = left edge, 100 = right edge).
 * y: where the base rests, as CSS from the top of the board. `cqw` = % of the board
 *    width, so corner spots scale with the board; `100%` is the bottom edge.
 * w: width in % of the board width. rotation in degrees.
 * toy: what happens when it's tapped (see components/letters/Figures.tsx).
 */
export type Figure = {
  src: string; alt: string; x: number; y: string; w: number; rotation: number;
  toy: "money-gun" | "lighter" | "mints" | "doll";
};

export const FIGURES: Figure[] = [
  // one on each corner, hanging slightly off the frame
  { src: "/figures/money-gun.webp", alt: "a money gun spraying cash", x: -3, y: "10cqw", w: 9, rotation: -10, toy: "money-gun" },
  { src: "/figures/cigarettes.webp", alt: "a pack of Gudang Garam with a lighter", x: 102.5, y: "12cqw", w: 10, rotation: 8, toy: "lighter" },
  { src: "/figures/doll.webp", alt: "a little doll figure", x: -3.5, y: "calc(100% + 0.5cqw)", w: 9, rotation: -3, toy: "doll" },
  { src: "/figures/mints.webp", alt: "a tin of Eclipse mints", x: 102.5, y: "calc(100% + 0.5cqw)", w: 9, rotation: -8, toy: "mints" },
];

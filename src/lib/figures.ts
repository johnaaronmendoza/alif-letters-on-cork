/**
 * Figures that sit around the corkboard. Images live in /public/figures.
 * x: horizontal position of the figure's base, in % of the page width
 *    (the board itself spans roughly 10%–90%).
 * y: where the base rests, as CSS from the top of the board — px for things
 *    sitting on the top frame (so they stay put as the board grows), % otherwise.
 * w: width in % of the page width. rotation in degrees.
 * toy: what happens when it's tapped (see components/letters/Figures.tsx).
 */
export type Figure = {
  src: string; alt: string; x: number; y: string; w: number; rotation: number;
  toy: "money-gun" | "lighter" | "mints" | "doll";
};

export const FIGURES: Figure[] = [
  // one in each corner, hanging slightly off the frame
  { src: "/figures/money-gun.webp", alt: "a money gun spraying cash", x: 8.5, y: "18px", w: 8.5, rotation: -10, toy: "money-gun" },
  { src: "/figures/cigarettes.webp", alt: "a pack of Gudang Garam with a lighter", x: 91.5, y: "22px", w: 10.5, rotation: 8, toy: "lighter" },
  { src: "/figures/doll.webp", alt: "a little doll figure", x: 8, y: "calc(100% - 2px)", w: 8.5, rotation: -3, toy: "doll" },
  { src: "/figures/mints.webp", alt: "a tin of Eclipse mints", x: 91.5, y: "calc(100% - 6px)", w: 9, rotation: -8, toy: "mints" },
];

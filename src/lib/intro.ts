/**
 * Intro sequence: the collage, cut into its pieces. Each piece is an image in
 * /public/board/intro/<name>.webp; x / y / w / h are % of the collage, and the
 * list is in stacking order (bottom first), which is also the order they slap on.
 * The title is last; empty.webp is the bare cork they land on.
 */
export type IntroPiece = { name: string; x: number; y: number; w: number; h: number };

export const INTRO_PIECES: IntroPiece[] = [
  { name: "strip-left", x: 0.167, y: 53.282, w: 10.0, h: 46.409 },
  { name: "strip-right", x: 6.542, y: 54.749, w: 9.333, h: 44.942 },
  { name: "secret", x: 1.333, y: 33.9, w: 20.292, h: 23.629 },
  { name: "cat-face", x: 6.333, y: 29.112, w: 6.042, h: 8.649 },
  { name: "keychain", x: 14.417, y: 47.259, w: 8.917, h: 32.664 },
  { name: "a7x", x: 73.958, y: 53.514, w: 15.208, h: 37.452 },
  { name: "polaroid-r", x: 83.0, y: 44.71, w: 14.5, h: 27.181 },
  { name: "finger", x: 91.333, y: 61.158, w: 7.375, h: 16.448 },
  { name: "stars", x: 77.292, y: 31.042, w: 9.75, h: 21.544 },
  { name: "polaroid-l", x: 24.667, y: 37.683, w: 11.917, h: 28.263 },
  { name: "rock-n-roll", x: 47.583, y: 14.208, w: 11.125, h: 15.676 },
  { name: "polaroid-tr", x: 53.833, y: 21.699, w: 14.5, h: 24.942 },
  { name: "cat", x: 43.292, y: 22.548, w: 8.083, h: 12.046 },
  { name: "lightning", x: 32.833, y: 20.695, w: 9.542, h: 23.552 },
  { name: "title", x: 35.333, y: 34.517, w: 26.833, h: 28.263 },
  { name: "rock-hand", x: 61.583, y: 44.942, w: 12.958, h: 30.193 },
  { name: "arsenal", x: 44.333, y: 77.683, w: 9.167, h: 19.382 },
];

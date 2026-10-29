/**
 * Intro sequence: the collage, cut into its pieces. Each piece is an image in
 * /public/board/intro/<name>.webp; x / y / w / h are % of the collage, and the
 * list is in stacking order (bottom first), which is also the order they slap on.
 * The tyre tracks sit at the bottom of the stack but skid in with the Arsenal
 * badge; the title is last. empty.webp is the bare cork they land on.
 */
export type IntroPiece = { name: string; x: number; y: number; w: number; h: number };

export const INTRO_PIECES: IntroPiece[] = [
  { name: "tracks", x: 30.625, y: 55.521, w: 37.083, h: 44.479 },
  { name: "strip-left", x: 0.0, y: 51.583, w: 11.5, h: 48.417 },
  { name: "strip-right", x: 5.625, y: 53.05, w: 11.583, h: 46.95 },
  { name: "secret", x: 0.417, y: 32.201, w: 22.542, h: 28.108 },
  { name: "cat-face", x: 5.417, y: 27.413, w: 8.292, h: 13.127 },
  { name: "keychain", x: 13.5, y: 45.56, w: 11.167, h: 37.143 },
  { name: "a7x", x: 73.042, y: 51.815, w: 17.458, h: 41.931 },
  { name: "polaroid-r", x: 82.083, y: 43.012, w: 16.75, h: 31.66 },
  { name: "finger", x: 90.417, y: 59.459, w: 9.583, h: 20.927 },
  { name: "stars", x: 76.375, y: 29.344, w: 12.0, h: 26.023 },
  { name: "polaroid-l", x: 23.75, y: 35.985, w: 14.167, h: 32.741 },
  { name: "rock-n-roll", x: 46.667, y: 12.51, w: 13.375, h: 20.154 },
  { name: "polaroid-tr", x: 52.917, y: 20.0, w: 16.75, h: 29.421 },
  { name: "cat", x: 42.375, y: 20.849, w: 10.333, h: 16.525 },
  { name: "lightning", x: 31.917, y: 18.996, w: 11.792, h: 28.031 },
  { name: "title", x: 34.417, y: 32.819, w: 29.083, h: 32.741 },
  { name: "rock-hand", x: 60.667, y: 43.243, w: 15.208, h: 34.672 },
  { name: "arsenal", x: 43.417, y: 75.985, w: 11.417, h: 23.861 },
];

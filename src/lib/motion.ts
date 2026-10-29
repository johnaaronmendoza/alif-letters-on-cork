/**
 * Shared motion tokens so every animation on the site has the same rhythm.
 * Springs for things that move in space; short eased fades for things that leave.
 * Exits run at roughly 60–70% of their enter duration.
 */
export const spring = {
  /** Letter falling onto the board and swinging on its pin. */
  drop: { type: "spring", stiffness: 210, damping: 14, mass: 0.9 },
  /** Modals, envelopes and hover lifts. */
  soft: { type: "spring", stiffness: 260, damping: 26 },
  /** Small presses and toggles. */
  snappy: { type: "spring", stiffness: 500, damping: 32 },
  /** Figures popping onto the shelf at the end of the intro. */
  pop: { type: "spring", stiffness: 420, damping: 15 },
  /** Intro photos tossed onto the board. */
  toss: { type: "spring", stiffness: 240, damping: 19, mass: 0.9 },
  /** Letter paper sliding up out of its envelope. */
  rise: { type: "spring", stiffness: 120, damping: 18 },
  /** Doll eyes trailing the cursor, deliberately late. */
  gaze: { stiffness: 60, damping: 16 },
} as const;

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  in: [0.55, 0, 1, 0.45] as const,
};

export const fadeOut = { duration: 0.18, ease: ease.in };

/** Pinned paper pivots from just under its pin, not from its middle. */
export const PIN_ORIGIN = "50% 6%";

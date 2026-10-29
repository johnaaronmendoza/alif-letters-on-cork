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
} as const;

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  in: [0.55, 0, 1, 0.45] as const,
};

export const fadeOut = { duration: 0.18, ease: ease.in };

/** Pinned paper pivots from just under its pin, not from its middle. */
export const PIN_ORIGIN = "50% 6%";

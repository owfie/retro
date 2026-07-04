export const MINUTE_HEIGHT = 2; // px per minute
export const SNAP_MINUTES = 15;
export const SNAP_PX = SNAP_MINUTES * MINUTE_HEIGHT; // 30px
export const HOUR_HEIGHT = 60 * MINUTE_HEIGHT; // 120px

export const DAY_START_MINUTES = 0;
export const DAY_END_MINUTES = 1440;
export const DEFAULT_VIEW_START = 540; // 9:00 AM
export const DEFAULT_VIEW_END = 1080; // 6:00 PM
export const DEFAULT_BLOCK_DURATION = 15;
export const TOTAL_DAY_HEIGHT = DAY_END_MINUTES * MINUTE_HEIGHT; // 2880px

// ── Motion feel ──────────────────────────────────────────────
// Gesture visuals are driven by "target" motion values rendered through
// spring followers (useSpring), so the on-screen motion is always continuous
// even when a target jumps across a snap detent.

/** Follows gesture targets. Near-critically damped: detents click without wobble. */
export const FOLLOW_SPRING = { stiffness: 550, damping: 40 } as const;
/** Lift in/out on pick-up and release. */
export const LIFT_SPRING = { stiffness: 400, damping: 28 } as const;
/** Collision squish build-up and decay. */
export const SQUISH_SPRING = { stiffness: 500, damping: 35 } as const;

/** How much a block leans toward the pointer between detents (0 = rigid). */
export const RESIDUAL_LEAN = 0.35;
/** Max scaleY compression when pushing against a neighbor. */
export const MAX_SQUISH = 0.12;
/** Squish amount per px of constrained overshoot. */
export const SQUISH_PER_PX = 0.02;
/** Visual gap between adjacent blocks (px). */
export const BLOCK_GAP = 2;

export const COLOR_PALETTE = [
	"#d6c9b8",
	"#b25f3e",
	"#8c4a32",
	"#caa958",
	"#777745",
	"#3d3e1e",
	"#84a7c3",
	"#3f627e",
] as const;

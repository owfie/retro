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

// ── Themes ───────────────────────────────────────────────────
// Blocks store a colorIndex, so switching themes recolors every block by
// remapping indices into the active theme's swatches.

export interface ThemeSwatch {
	bg: string;
	text: string;
}

export interface Theme {
	name: string;
	swatches: readonly ThemeSwatch[];
}

export const PALETTE_SIZE = 8;

export const THEMES = {
	nightLight: {
		name: "Night Light",
		swatches: [
			{ bg: "#f8d8ac", text: "#8a5a24" },
			{ bg: "#d6d0f5", text: "#4534a8" },
			{ bg: "#e4e4e4", text: "#7d7d7d" },
			{ bg: "#c9dff5", text: "#2e5d8a" },
			{ bg: "#b9c4f2", text: "#33418f" },
			{ bg: "#cdeedd", text: "#2e7d54" },
			{ bg: "#f5d3e0", text: "#a04468" },
			{ bg: "#f3e7bd", text: "#8a7524" },
		],
	},
	autumn: {
		name: "Autumn",
		swatches: [
			{ bg: "#d6c9b8", text: "#ffffff" },
			{ bg: "#b25f3e", text: "#ffffff" },
			{ bg: "#8c4a32", text: "#ffffff" },
			{ bg: "#caa958", text: "#ffffff" },
			{ bg: "#777745", text: "#ffffff" },
			{ bg: "#3d3e1e", text: "#ffffff" },
			{ bg: "#84a7c3", text: "#ffffff" },
			{ bg: "#3f627e", text: "#ffffff" },
		],
	},
} as const satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;

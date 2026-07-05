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
export const ENTRANCE_SPRING = { stiffness: 450, damping: 24 } as const;
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

export const PALETTE_SIZE = 5;

function relativeLuminance(hex: string): number {
	const n = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
	const [r, g, b] = [n(1), n(3), n(5)].map((c) =>
		c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
	);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function swatch(bg: string): ThemeSwatch {
	return { bg, text: relativeLuminance(bg) > 0.55 ? "#2a2a2a" : "#ffffff" };
}

/** v0 persisted raw hex colors from the original autumn palette. */
export const LEGACY_V0_PALETTE = [
	"#d6c9b8",
	"#b25f3e",
	"#8c4a32",
	"#caa958",
	"#777745",
	"#3d3e1e",
	"#84a7c3",
	"#3f627e",
] as const;

export const THEMES = {
	bubblegum: {
		name: "Bubblegum",
		swatches: [
			swatch("#ffd6ff"),
			swatch("#e7c6ff"),
			swatch("#c8b6ff"),
			swatch("#b8c0ff"),
			swatch("#bbd0ff"),
		],
	},
	peach: {
		name: "Peach",
		swatches: [
			swatch("#f08080"),
			swatch("#f4978e"),
			swatch("#f8ad9d"),
			swatch("#fbc4ab"),
			swatch("#ffdab9"),
		],
	},
	twilight: {
		name: "Twilight",
		swatches: [
			swatch("#ffcdb2"),
			swatch("#ffb4a2"),
			swatch("#e5989b"),
			swatch("#b5838d"),
			swatch("#6d6875"),
		],
	},
	moss: {
		name: "Moss",
		swatches: [
			swatch("#85893E"),
			swatch("#C8CE5C"),
			swatch("#D9E980"),
			swatch("#F8FFD1"),
			swatch("#FFDD6C"),
		],
	},
} as const satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;

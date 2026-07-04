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

export const MINUTE_HEIGHT = 1.2; // px per minute
export const SNAP_MINUTES = 15;
export const SNAP_PX = SNAP_MINUTES * MINUTE_HEIGHT; // 18px
export const HOUR_HEIGHT = 60 * MINUTE_HEIGHT; // 72px

export const DAY_START_MINUTES = 0;
export const DAY_END_MINUTES = 1440;
export const DEFAULT_VIEW_START = 540; // 9:00 AM
export const DEFAULT_VIEW_END = 1080; // 6:00 PM
export const DEFAULT_BLOCK_DURATION = 15;
export const TOTAL_DAY_HEIGHT = DAY_END_MINUTES * MINUTE_HEIGHT; // 1728px

export const COLOR_PALETTE = [
	"#E07A5F", // terracotta
	"#3D85C6", // steel blue
	"#81B29A", // sage
	"#F2CC8F", // sand
	"#9B72AA", // muted purple
	"#E8A87C", // peach
	"#41B3A3", // teal
	"#C38D9E", // mauve
] as const;

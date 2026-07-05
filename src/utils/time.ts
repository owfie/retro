import { MINUTE_HEIGHT, SNAP_MINUTES, SNAP_PX } from "@/constants";

export function minutesToPx(minutes: number): number {
	return minutes * MINUTE_HEIGHT;
}

export function pxToMinutes(px: number): number {
	return px / MINUTE_HEIGHT;
}

export function snapMinutes(minutes: number): number {
	return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function snapPx(px: number): number {
	return Math.round(px / SNAP_PX) * SNAP_PX;
}

export function pxToSnappedMinutes(px: number): number {
	const minutes = pxToMinutes(px);
	return Math.floor(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function clampMinutes(
	minutes: number,
	min: number,
	max: number,
): number {
	return Math.max(min, Math.min(max, minutes));
}

export interface DurationLabelSegments {
	hours: string | null;
	minutes: string | null;
}

export function getDurationLabelSegments(
	totalMinutes: number,
): DurationLabelSegments {
	const rounded = Math.max(0, Math.round(totalMinutes));
	const h = Math.floor(rounded / 60);
	const m = rounded % 60;
	return {
		hours: h > 0 ? `${h}h` : null,
		minutes: h > 0 ? (m > 0 ? `${m}m` : null) : `${rounded}m`,
	};
}

export function formatDurationLabel(totalMinutes: number): string {
	const { hours, minutes } = getDurationLabelSegments(totalMinutes);
	if (hours && minutes) return `${hours} ${minutes}`;
	return hours ?? minutes ?? "0m";
}

export function parseLocalDate(iso: string): Date {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d);
}

export function formatDateToISO(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

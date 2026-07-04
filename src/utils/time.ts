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

export function formatMinutesLabel(
	totalMinutes: number,
	includePeriod: boolean,
): string {
	const h24 = Math.floor(totalMinutes / 60) % 24;
	const m = Math.round(totalMinutes % 60);
	const period = h24 < 12 ? "AM" : "PM";
	const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
	const base = m === 0 ? `${h12}` : `${h12}:${String(m).padStart(2, "0")}`;
	return includePeriod ? `${base} ${period}` : base;
}

export function formatTimeRange(
	startMinute: number,
	endMinute: number,
): string {
	const startPeriod = Math.floor(startMinute / 60) % 24 < 12 ? "AM" : "PM";
	const endPeriod = Math.floor(endMinute / 60) % 24 < 12 ? "AM" : "PM";
	return `${formatMinutesLabel(startMinute, startPeriod !== endPeriod)} – ${formatMinutesLabel(endMinute, true)}`;
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

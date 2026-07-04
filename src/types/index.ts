export interface TimeBlock {
	id: string;
	date: string; // ISO date "2026-03-22"
	startMinute: number; // minutes from midnight (e.g. 540 = 9:00 AM)
	durationMinutes: number; // multiple of 15, minimum 15
	label: string;
	colorIndex: number;
}

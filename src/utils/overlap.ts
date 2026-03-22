import { DAY_END_MINUTES, SNAP_MINUTES } from "@/constants";
import type { TimeBlock } from "@/types";

/** Check if two time ranges overlap (touching endpoints are OK) */
export function rangesOverlap(
	startA: number,
	endA: number,
	startB: number,
	endB: number,
): boolean {
	return startA < endB && endA > startB;
}

/** Get sibling blocks on the same date, excluding given IDs, sorted by startMinute */
export function getSiblings(
	blocks: TimeBlock[],
	date: string,
	excludeIds: string[],
): TimeBlock[] {
	return blocks
		.filter((b) => b.date === date && !excludeIds.includes(b.id))
		.sort((a, b) => a.startMinute - b.startMinute);
}

/** Constrain a proposed move so the block doesn't overlap siblings.
 *  Finds all valid gaps and picks the closest placement to proposedStart. */
export function constrainMove(
	blockDuration: number,
	proposedStart: number,
	siblings: TimeBlock[],
): number {
	// Build list of gaps the block fits in
	const gaps: Array<{ start: number; end: number }> = [];

	if (siblings.length === 0) {
		return Math.max(0, Math.min(DAY_END_MINUTES - blockDuration, proposedStart));
	}

	// Gap before first block
	if (siblings[0].startMinute >= blockDuration) {
		gaps.push({ start: 0, end: siblings[0].startMinute });
	}

	// Gaps between blocks
	for (let i = 0; i < siblings.length - 1; i++) {
		const gapStart = siblings[i].startMinute + siblings[i].durationMinutes;
		const gapEnd = siblings[i + 1].startMinute;
		if (gapEnd - gapStart >= blockDuration) {
			gaps.push({ start: gapStart, end: gapEnd });
		}
	}

	// Gap after last block
	const lastEnd =
		siblings[siblings.length - 1].startMinute +
		siblings[siblings.length - 1].durationMinutes;
	if (DAY_END_MINUTES - lastEnd >= blockDuration) {
		gaps.push({ start: lastEnd, end: DAY_END_MINUTES });
	}

	// No valid gaps — return clamped to day boundaries (shouldn't happen in practice)
	if (gaps.length === 0) {
		return Math.max(0, Math.min(DAY_END_MINUTES - blockDuration, proposedStart));
	}

	// Find the best placement: closest to proposedStart within any gap
	let bestStart = proposedStart;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const gap of gaps) {
		// Clamp proposed position within this gap
		const candidate = Math.max(
			gap.start,
			Math.min(proposedStart, gap.end - blockDuration),
		);
		const dist = Math.abs(candidate - proposedStart);
		if (dist < bestDistance) {
			bestDistance = dist;
			bestStart = candidate;
		}
	}

	return bestStart;
}

/** Constrain bottom resize: max duration before hitting the next block below */
export function constrainResizeBottom(
	blockStart: number,
	proposedDuration: number,
	siblings: TimeBlock[],
): number {
	let maxDuration = DAY_END_MINUTES - blockStart;

	for (const s of siblings) {
		if (s.startMinute >= blockStart) {
			maxDuration = Math.min(maxDuration, s.startMinute - blockStart);
			break; // siblings are sorted, first one above is the constraint
		}
	}

	return Math.max(SNAP_MINUTES, Math.min(proposedDuration, maxDuration));
}

/** Constrain top resize: min startMinute before hitting the block above */
export function constrainResizeTop(
	blockEnd: number,
	proposedStart: number,
	siblings: TimeBlock[],
): { startMinute: number; durationMinutes: number } {
	let minStart = 0;

	// Find the nearest sibling above (iterate in reverse since sorted ascending)
	for (let i = siblings.length - 1; i >= 0; i--) {
		const s = siblings[i];
		const sEnd = s.startMinute + s.durationMinutes;
		if (sEnd <= blockEnd) {
			minStart = sEnd;
			break;
		}
	}

	const constrainedStart = Math.max(minStart, Math.min(proposedStart, blockEnd - SNAP_MINUTES));
	return {
		startMinute: constrainedStart,
		durationMinutes: blockEnd - constrainedStart,
	};
}

/** Find the nearest valid position for a new block of given duration */
export function findNearestGap(
	desiredStart: number,
	duration: number,
	siblings: TimeBlock[],
): number | null {
	// Try the desired position first
	const desiredEnd = desiredStart + duration;
	const hasOverlap = siblings.some((s) =>
		rangesOverlap(desiredStart, desiredEnd, s.startMinute, s.startMinute + s.durationMinutes),
	);

	if (!hasOverlap && desiredStart >= 0 && desiredEnd <= DAY_END_MINUTES) {
		return desiredStart;
	}

	// Search for the nearest gap
	let bestStart: number | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;

	// Check gap before first block
	if (siblings.length === 0) {
		return Math.max(0, Math.min(desiredStart, DAY_END_MINUTES - duration));
	}

	// Gap at start of day
	if (siblings[0].startMinute >= duration) {
		const gapStart = Math.max(0, Math.min(desiredStart, siblings[0].startMinute - duration));
		const dist = Math.abs(gapStart - desiredStart);
		if (dist < bestDistance) {
			bestDistance = dist;
			bestStart = gapStart;
		}
	}

	// Gaps between blocks
	for (let i = 0; i < siblings.length - 1; i++) {
		const gapStart = siblings[i].startMinute + siblings[i].durationMinutes;
		const gapEnd = siblings[i + 1].startMinute;
		if (gapEnd - gapStart >= duration) {
			const candidate = Math.max(gapStart, Math.min(desiredStart, gapEnd - duration));
			const dist = Math.abs(candidate - desiredStart);
			if (dist < bestDistance) {
				bestDistance = dist;
				bestStart = candidate;
			}
		}
	}

	// Gap after last block
	const lastEnd = siblings[siblings.length - 1].startMinute + siblings[siblings.length - 1].durationMinutes;
	if (DAY_END_MINUTES - lastEnd >= duration) {
		const candidate = Math.max(lastEnd, Math.min(desiredStart, DAY_END_MINUTES - duration));
		const dist = Math.abs(candidate - desiredStart);
		if (dist < bestDistance) {
			bestStart = candidate;
		}
	}

	return bestStart;
}

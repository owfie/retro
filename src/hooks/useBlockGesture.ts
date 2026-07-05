import type { MotionValue } from "motion/react";
import { useCallback } from "react";
import {
	DAY_END_MINUTES,
	MAX_SQUISH,
	MINUTE_HEIGHT,
	RESIDUAL_LEAN,
	SNAP_MINUTES,
	SQUISH_PER_PX,
} from "@/constants";
import { useStore } from "@/store";
import type { TimeBlock } from "@/types";
import { startVerticalGesture } from "@/utils/gesture";
import {
	constrainMove,
	constrainResizeBottom,
	constrainResizeTop,
} from "@/utils/overlap";
import { snapMinutes } from "@/utils/time";

export type LiveTimeRange = { start: number; end: number };

/**
 * Target motion values for gesture feedback. These are set synchronously by
 * the gesture handlers; TimeBlock renders them through spring followers, so
 * detent jumps in the targets become continuous snaps on screen.
 */
export type ResizeEdge = "top" | "bottom";

export interface BlockGestureTargets {
	top: MotionValue<number>;
	height: MotionValue<number>;
	liveRange: MotionValue<LiveTimeRange | null>;
	resizeEdgeActive: MotionValue<ResizeEdge | null>;
}

export interface GestureVisuals {
	lift: MotionValue<number>;
	squish: MotionValue<number>;
	liveRange: MotionValue<LiveTimeRange | null>;
	resizeEdgeActive: MotionValue<ResizeEdge | null>;
}

/** Lean toward the pointer between detents, in px. */
function leanPx(residualMinutes: number): number {
	return residualMinutes * MINUTE_HEIGHT * RESIDUAL_LEAN;
}

interface UseBlockGestureOptions {
	block: TimeBlock;
	siblings: TimeBlock[];
	neighborAbove: TimeBlock | null;
	neighborBelow: TimeBlock | null;
	targetTop: MotionValue<number>;
	targetHeight: MotionValue<number>;
	visuals: GestureVisuals;
	/** Fired when the pointer is released without dragging (click-to-edit). */
	onTap?: () => void;
	getNeighborTargets: (id: string) => BlockGestureTargets | undefined;
	isEditing: boolean;
}

export function useBlockGesture({
	block,
	siblings,
	neighborAbove,
	neighborBelow,
	targetTop,
	targetHeight,
	visuals,
	onTap,
	getNeighborTargets,
	isEditing,
}: UseBlockGestureOptions) {
	const updateBlock = useStore((s) => s.updateBlock);
	const updateBlocks = useStore((s) => s.updateBlocks);
	const setDraggingBlock = useStore((s) => s.setDraggingBlock);

	// ── Drag to move / tap to edit ───────────────────────
	// Nothing lifts or commits until real movement: a plain click resolves
	// to onTap (edit). The day-swipe never fires from a block because the
	// paginator only arms its drag from empty-grid pointerdowns; isDraggingBlock
	// is kept as shared "a block gesture is active" state for future use
	// (horizontal movement is reserved for coming day-to-day dragging).

	const onBlockPointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (isEditing) return;
			if (e.button !== 0) return;
			e.preventDefault();
			e.stopPropagation();

			const initialStart = block.startMinute;
			const duration = block.durationMinutes;
			const maxStart = DAY_END_MINUTES - duration;
			let currentStart = initialStart;
			let lastSnapped = initialStart;

			setDraggingBlock(true);

			startVerticalGesture(e, {
				onBegin: () => {
					visuals.lift.set(1);
					visuals.liveRange.set({
						start: initialStart,
						end: initialStart + duration,
					});
				},
				onUpdate: ({ deltaMinutes, began }) => {
					if (!began) return;
					const proposed = initialStart + deltaMinutes;
					currentStart = constrainMove(duration, proposed, siblings);

					const snapped = Math.max(
						0,
						Math.min(maxStart, snapMinutes(currentStart)),
					);
					if (snapped !== lastSnapped) {
						lastSnapped = snapped;
						visuals.liveRange.set({
							start: snapped,
							end: snapped + duration,
						});
					}
					// Detent + lean toward the pointer; the follower spring keeps
					// the on-screen motion continuous across detent jumps.
					targetTop.set(
						snapped * MINUTE_HEIGHT + leanPx(currentStart - snapped),
					);

					// Collision squish (signed: positive = pushing down)
					const overshoot = proposed - currentStart;
					visuals.squish.set(
						Math.abs(overshoot) > 0.5
							? Math.sign(overshoot) *
									Math.min(
										MAX_SQUISH,
										Math.abs(overshoot) * MINUTE_HEIGHT * SQUISH_PER_PX,
									)
							: 0,
					);
				},
				onEnd: ({ began, cancelled }) => {
					if (!began) {
						setDraggingBlock(false);
						if (!cancelled) onTap?.();
						return;
					}
					const clamped = Math.max(
						0,
						Math.min(maxStart, snapMinutes(currentStart)),
					);
					targetTop.set(clamped * MINUTE_HEIGHT);
					visuals.lift.set(0);
					visuals.squish.set(0);
					visuals.liveRange.set(null);
					updateBlock(block.id, { startMinute: clamped });
					setDraggingBlock(false);
				},
			});
		},
		[
			isEditing,
			block,
			siblings,
			targetTop,
			visuals,
			onTap,
			updateBlock,
			setDraggingBlock,
		],
	);

	// ── Resize Bottom ────────────────────────────────────

	const onBottomHandlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();

			const initialDuration = block.durationMinutes;
			const blockEnd = block.startMinute + initialDuration;
			const isShared = neighborBelow != null;
			const neighborInitialDuration = neighborBelow?.durationMinutes ?? 0;

			// For shared border, exclude both this block and neighbor from siblings
			const effectiveSiblings = isShared
				? siblings.filter((s) => s.id !== neighborBelow.id)
				: siblings;

			let currentDuration = initialDuration;
			let lastSnapped = initialDuration;

			setDraggingBlock(true);
			const neighborTargets = isShared
				? getNeighborTargets(neighborBelow.id)
				: undefined;

			const neighborFor = (snappedDuration: number) => {
				const start = block.startMinute + snappedDuration;
				return {
					start,
					duration: blockEnd + neighborInitialDuration - start,
				};
			};

			startVerticalGesture(e, {
				onBegin: () => {
					visuals.liveRange.set({
						start: block.startMinute,
						end: block.startMinute + initialDuration,
					});
					visuals.resizeEdgeActive.set("bottom");
					if (neighborTargets) {
						neighborTargets.resizeEdgeActive.set("top");
						neighborTargets.liveRange.set({
							start: block.startMinute + initialDuration,
							end: blockEnd + neighborInitialDuration,
						});
					}
				},
				onUpdate: ({ deltaMinutes, began }) => {
					if (!began) return;
					const proposedDuration = initialDuration + deltaMinutes;

					if (isShared) {
						const maxDuration =
							initialDuration + neighborInitialDuration - SNAP_MINUTES;
						currentDuration = Math.max(
							SNAP_MINUTES,
							Math.min(proposedDuration, maxDuration),
						);
					} else {
						currentDuration = constrainResizeBottom(
							block.startMinute,
							proposedDuration,
							effectiveSiblings,
						);
					}

					const snappedDuration = Math.max(
						SNAP_MINUTES,
						snapMinutes(currentDuration),
					);
					const lean = leanPx(currentDuration - snappedDuration);
					const borderPx =
						(block.startMinute + snappedDuration) * MINUTE_HEIGHT + lean;

					targetHeight.set(borderPx - block.startMinute * MINUTE_HEIGHT);

					if (neighborTargets) {
						const neighborEnd = blockEnd + neighborInitialDuration;
						neighborTargets.top.set(borderPx);
						neighborTargets.height.set(
							neighborEnd * MINUTE_HEIGHT - borderPx,
						);
						if (snappedDuration !== lastSnapped) {
							lastSnapped = snappedDuration;
							const neighborStart = block.startMinute + snappedDuration;
							neighborTargets.liveRange.set({
								start: neighborStart,
								end: neighborEnd,
							});
							visuals.liveRange.set({
								start: block.startMinute,
								end: neighborStart,
							});
						}
					} else if (snappedDuration !== lastSnapped) {
						lastSnapped = snappedDuration;
						visuals.liveRange.set({
							start: block.startMinute,
							end: block.startMinute + snappedDuration,
						});
					}
				},
				onEnd: ({ began }) => {
					if (!began) {
						setDraggingBlock(false);
						return;
					}
					const snappedDuration = Math.max(
						SNAP_MINUTES,
						snapMinutes(currentDuration),
					);
					targetHeight.set(snappedDuration * MINUTE_HEIGHT);
					visuals.liveRange.set(null);
					visuals.resizeEdgeActive.set(null);
					neighborTargets?.resizeEdgeActive.set(null);
					neighborTargets?.liveRange.set(null);

					if (isShared) {
						const neighbor = neighborFor(snappedDuration);
						const snappedNeighborDuration = Math.max(
							SNAP_MINUTES,
							snapMinutes(neighbor.duration),
						);
						if (neighborTargets) {
							neighborTargets.top.set(neighbor.start * MINUTE_HEIGHT);
							neighborTargets.height.set(
								snappedNeighborDuration * MINUTE_HEIGHT,
							);
						}
						updateBlocks([
							{
								id: block.id,
								changes: { durationMinutes: snappedDuration },
							},
							{
								id: neighborBelow.id,
								changes: {
									startMinute: neighbor.start,
									durationMinutes: snappedNeighborDuration,
								},
							},
						]);
					} else {
						updateBlock(block.id, { durationMinutes: snappedDuration });
					}
					setDraggingBlock(false);
				},
			});
		},
		[
			block,
			siblings,
			neighborBelow,
			targetHeight,
			visuals,
			getNeighborTargets,
			updateBlock,
			updateBlocks,
			setDraggingBlock,
		],
	);

	// ── Resize Top ───────────────────────────────────────

	const onTopHandlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();

			const initialStart = block.startMinute;
			const blockEnd = block.startMinute + block.durationMinutes;
			const isShared = neighborAbove != null;
			const neighborStart = neighborAbove?.startMinute ?? 0;

			const effectiveSiblings = isShared
				? siblings.filter((s) => s.id !== neighborAbove.id)
				: siblings;

			let currentStart = initialStart;
			let lastFinalStart = initialStart;

			setDraggingBlock(true);
			const neighborTargets = isShared
				? getNeighborTargets(neighborAbove.id)
				: undefined;

			startVerticalGesture(e, {
				onBegin: () => {
					visuals.liveRange.set({
						start: initialStart,
						end: blockEnd,
					});
					visuals.resizeEdgeActive.set("top");
					if (neighborTargets) {
						neighborTargets.resizeEdgeActive.set("bottom");
						neighborTargets.liveRange.set({
							start: neighborStart,
							end: initialStart,
						});
					}
				},
				onUpdate: ({ deltaMinutes, began }) => {
					if (!began) return;
					const proposedStart = initialStart + deltaMinutes;

					if (isShared) {
						const minStart = neighborStart + SNAP_MINUTES;
						const maxStart = blockEnd - SNAP_MINUTES;
						currentStart = Math.max(
							minStart,
							Math.min(proposedStart, maxStart),
						);
					} else {
						currentStart = constrainResizeTop(
							blockEnd,
							proposedStart,
							effectiveSiblings,
						).startMinute;
					}

					const snappedDur = Math.max(
						SNAP_MINUTES,
						blockEnd - snapMinutes(currentStart),
					);
					const finalStart = blockEnd - snappedDur;
					const lean = leanPx(currentStart - finalStart);
					const borderPx = finalStart * MINUTE_HEIGHT + lean;

					targetTop.set(borderPx);
					targetHeight.set(blockEnd * MINUTE_HEIGHT - borderPx);

					if (neighborTargets) {
						neighborTargets.height.set(
							borderPx - neighborStart * MINUTE_HEIGHT,
						);
						if (finalStart !== lastFinalStart) {
							lastFinalStart = finalStart;
							neighborTargets.liveRange.set({
								start: neighborStart,
								end: finalStart,
							});
							visuals.liveRange.set({ start: finalStart, end: blockEnd });
						}
					} else if (finalStart !== lastFinalStart) {
						lastFinalStart = finalStart;
						visuals.liveRange.set({ start: finalStart, end: blockEnd });
					}
				},
				onEnd: ({ began }) => {
					if (!began) {
						setDraggingBlock(false);
						return;
					}
					const snappedDuration = Math.max(
						SNAP_MINUTES,
						blockEnd - snapMinutes(currentStart),
					);
					const finalStart = blockEnd - snappedDuration;
					targetTop.set(finalStart * MINUTE_HEIGHT);
					targetHeight.set(snappedDuration * MINUTE_HEIGHT);
					visuals.liveRange.set(null);
					visuals.resizeEdgeActive.set(null);
					neighborTargets?.resizeEdgeActive.set(null);
					neighborTargets?.liveRange.set(null);

					if (isShared) {
						const snappedNeighborDuration = Math.max(
							SNAP_MINUTES,
							snapMinutes(finalStart - neighborStart),
						);
						neighborTargets?.height.set(
							snappedNeighborDuration * MINUTE_HEIGHT,
						);
						updateBlocks([
							{
								id: block.id,
								changes: {
									startMinute: finalStart,
									durationMinutes: snappedDuration,
								},
							},
							{
								id: neighborAbove.id,
								changes: { durationMinutes: snappedNeighborDuration },
							},
						]);
					} else {
						updateBlock(block.id, {
							startMinute: finalStart,
							durationMinutes: snappedDuration,
						});
					}
					setDraggingBlock(false);
				},
			});
		},
		[
			block,
			siblings,
			neighborAbove,
			targetTop,
			targetHeight,
			visuals,
			getNeighborTargets,
			updateBlock,
			updateBlocks,
			setDraggingBlock,
		],
	);

	return {
		onBlockPointerDown,
		onTopHandlePointerDown,
		onBottomHandlePointerDown,
	};
}

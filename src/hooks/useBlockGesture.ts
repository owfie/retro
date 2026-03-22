import {
	DAY_END_MINUTES,
	MINUTE_HEIGHT,
	SNAP_MINUTES,
} from "@/constants";
import { useStore } from "@/store";
import type { TimeBlock } from "@/types";
import {
	constrainMove,
	constrainResizeBottom,
	constrainResizeTop,
} from "@/utils/overlap";
import { snapMinutes } from "@/utils/time";
import { type MotionValue, animate } from "motion/react";
import { useCallback, useRef } from "react";

const SNAP_SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };

interface UseBlockGestureOptions {
	block: TimeBlock;
	siblings: TimeBlock[];
	neighborAbove: TimeBlock | null;
	neighborBelow: TimeBlock | null;
	motionTop: MotionValue<number>;
	motionHeight: MotionValue<number>;
	getNeighborMotion: (
		id: string,
	) => { top: MotionValue<number>; height: MotionValue<number> } | undefined;
	isEditing: boolean;
}

export function useBlockGesture({
	block,
	siblings,
	neighborAbove,
	neighborBelow,
	motionTop,
	motionHeight,
	getNeighborMotion,
	isEditing,
}: UseBlockGestureOptions) {
	const updateBlock = useStore((s) => s.updateBlock);
	const updateBlocks = useStore((s) => s.updateBlocks);
	const gestureActiveRef = useRef(false);

	// ── Drag ──────────────────────────────────────────────

	const onBlockPointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (isEditing) return;
			e.preventDefault();

			const el = e.currentTarget as HTMLElement;
			el.setPointerCapture(e.pointerId);

			const startY = e.clientY;
			const initialStart = block.startMinute;
			let currentStart = initialStart;
			gestureActiveRef.current = true;

			const onMove = (ev: PointerEvent) => {
				const deltaMinutes = (ev.clientY - startY) / MINUTE_HEIGHT;
				const proposed = initialStart + deltaMinutes;
				currentStart = constrainMove(
					block.durationMinutes,
					proposed,
					siblings,
				);
				motionTop.set(currentStart * MINUTE_HEIGHT);
			};

			const onUp = () => {
				el.removeEventListener("pointermove", onMove);
				el.removeEventListener("pointerup", onUp);
				el.removeEventListener("pointercancel", onUp);

				const snapped = snapMinutes(currentStart);
				const clamped = Math.max(
					0,
					Math.min(DAY_END_MINUTES - block.durationMinutes, snapped),
				);

				animate(motionTop, clamped * MINUTE_HEIGHT, SNAP_SPRING);
				// Small delay to let animation start before committing store
				requestAnimationFrame(() => {
					updateBlock(block.id, { startMinute: clamped });
					gestureActiveRef.current = false;
				});
			};

			el.addEventListener("pointermove", onMove);
			el.addEventListener("pointerup", onUp);
			el.addEventListener("pointercancel", onUp);
		},
		[isEditing, block, siblings, motionTop, updateBlock],
	);

	// ── Resize Bottom ────────────────────────────────────

	const onBottomHandlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();

			const el = e.currentTarget as HTMLElement;
			el.setPointerCapture(e.pointerId);

			const startY = e.clientY;
			const initialDuration = block.durationMinutes;
			const blockEnd = block.startMinute + block.durationMinutes;
			const isShared = neighborBelow != null;
			const neighborInitialDuration = neighborBelow?.durationMinutes ?? 0;

			// For shared border, exclude both this block and neighbor from siblings
			const effectiveSiblings = isShared
				? siblings.filter((s) => s.id !== neighborBelow.id)
				: siblings;

			let currentDuration = initialDuration;
			gestureActiveRef.current = true;

			const neighborMotion = isShared
				? getNeighborMotion(neighborBelow.id)
				: undefined;

			const onMove = (ev: PointerEvent) => {
				const deltaMinutes = (ev.clientY - startY) / MINUTE_HEIGHT;

				if (isShared) {
					// Shared border: resize both blocks
					const proposedDuration = initialDuration + deltaMinutes;
					// Clamp: this block min 15min, neighbor min 15min
					const maxDuration =
						initialDuration + neighborInitialDuration - SNAP_MINUTES;
					currentDuration = Math.max(
						SNAP_MINUTES,
						Math.min(proposedDuration, maxDuration),
					);

					const newNeighborStart =
						block.startMinute + currentDuration;
					const newNeighborDuration = blockEnd + neighborInitialDuration - block.startMinute - currentDuration;

					motionHeight.set(currentDuration * MINUTE_HEIGHT);
					if (neighborMotion) {
						neighborMotion.top.set(
							newNeighborStart * MINUTE_HEIGHT,
						);
						neighborMotion.height.set(
							newNeighborDuration * MINUTE_HEIGHT,
						);
					}
				} else {
					// Single block resize
					const proposedDuration = initialDuration + deltaMinutes;
					currentDuration = constrainResizeBottom(
						block.startMinute,
						proposedDuration,
						effectiveSiblings,
					);
					motionHeight.set(currentDuration * MINUTE_HEIGHT);
				}
			};

			const onUp = () => {
				el.removeEventListener("pointermove", onMove);
				el.removeEventListener("pointerup", onUp);
				el.removeEventListener("pointercancel", onUp);

				const snappedDuration = Math.max(
					SNAP_MINUTES,
					snapMinutes(currentDuration),
				);

				if (isShared) {
					const newNeighborStart =
						block.startMinute + snappedDuration;
					const newNeighborDuration =
						blockEnd + neighborInitialDuration - block.startMinute - snappedDuration;
					const snappedNeighborDuration = Math.max(
						SNAP_MINUTES,
						snapMinutes(newNeighborDuration),
					);

					animate(
						motionHeight,
						snappedDuration * MINUTE_HEIGHT,
						SNAP_SPRING,
					);
					if (neighborMotion) {
						animate(
							neighborMotion.top,
							newNeighborStart * MINUTE_HEIGHT,
							SNAP_SPRING,
						);
						animate(
							neighborMotion.height,
							snappedNeighborDuration * MINUTE_HEIGHT,
							SNAP_SPRING,
						);
					}

					requestAnimationFrame(() => {
						updateBlocks([
							{
								id: block.id,
								changes: { durationMinutes: snappedDuration },
							},
							{
								id: neighborBelow.id,
								changes: {
									startMinute: newNeighborStart,
									durationMinutes: snappedNeighborDuration,
								},
							},
						]);
						gestureActiveRef.current = false;
					});
				} else {
					animate(
						motionHeight,
						snappedDuration * MINUTE_HEIGHT,
						SNAP_SPRING,
					);
					requestAnimationFrame(() => {
						updateBlock(block.id, {
							durationMinutes: snappedDuration,
						});
						gestureActiveRef.current = false;
					});
				}
			};

			el.addEventListener("pointermove", onMove);
			el.addEventListener("pointerup", onUp);
			el.addEventListener("pointercancel", onUp);
		},
		[
			block,
			siblings,
			neighborBelow,
			motionHeight,
			getNeighborMotion,
			updateBlock,
			updateBlocks,
		],
	);

	// ── Resize Top ───────────────────────────────────────

	const onTopHandlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();

			const el = e.currentTarget as HTMLElement;
			el.setPointerCapture(e.pointerId);

			const startY = e.clientY;
			const initialStart = block.startMinute;
			const blockEnd = block.startMinute + block.durationMinutes;
			const isShared = neighborAbove != null;
			const neighborStart = neighborAbove?.startMinute ?? 0;

			const effectiveSiblings = isShared
				? siblings.filter((s) => s.id !== neighborAbove.id)
				: siblings;

			let currentStart = initialStart;
			let currentDuration = block.durationMinutes;
			gestureActiveRef.current = true;

			const neighborMotion = isShared
				? getNeighborMotion(neighborAbove.id)
				: undefined;

			const onMove = (ev: PointerEvent) => {
				const deltaMinutes = (ev.clientY - startY) / MINUTE_HEIGHT;

				if (isShared) {
					// Shared border: resize both blocks
					const proposedStart = initialStart + deltaMinutes;
					// Clamp: this block min 15min, neighbor min 15min
					const minStart = neighborStart + SNAP_MINUTES;
					const maxStart = blockEnd - SNAP_MINUTES;
					currentStart = Math.max(
						minStart,
						Math.min(proposedStart, maxStart),
					);
					currentDuration = blockEnd - currentStart;

					const newNeighborDuration =
						currentStart - neighborStart;

					motionTop.set(currentStart * MINUTE_HEIGHT);
					motionHeight.set(currentDuration * MINUTE_HEIGHT);
					if (neighborMotion) {
						neighborMotion.height.set(
							newNeighborDuration * MINUTE_HEIGHT,
						);
					}
				} else {
					// Single block resize from top
					const proposedStart = initialStart + deltaMinutes;
					const constrained = constrainResizeTop(
						blockEnd,
						proposedStart,
						effectiveSiblings,
					);
					currentStart = constrained.startMinute;
					currentDuration = constrained.durationMinutes;

					motionTop.set(currentStart * MINUTE_HEIGHT);
					motionHeight.set(currentDuration * MINUTE_HEIGHT);
				}
			};

			const onUp = () => {
				el.removeEventListener("pointermove", onMove);
				el.removeEventListener("pointerup", onUp);
				el.removeEventListener("pointercancel", onUp);

				const snappedStart = snapMinutes(currentStart);
				const snappedDuration = Math.max(
					SNAP_MINUTES,
					blockEnd - snappedStart,
				);
				const finalStart = blockEnd - snappedDuration;

				animate(
					motionTop,
					finalStart * MINUTE_HEIGHT,
					SNAP_SPRING,
				);
				animate(
					motionHeight,
					snappedDuration * MINUTE_HEIGHT,
					SNAP_SPRING,
				);

				if (isShared) {
					const newNeighborDuration = finalStart - neighborStart;
					const snappedNeighborDuration = Math.max(
						SNAP_MINUTES,
						snapMinutes(newNeighborDuration),
					);

					if (neighborMotion) {
						animate(
							neighborMotion.height,
							snappedNeighborDuration * MINUTE_HEIGHT,
							SNAP_SPRING,
						);
					}

					requestAnimationFrame(() => {
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
								changes: {
									durationMinutes: snappedNeighborDuration,
								},
							},
						]);
						gestureActiveRef.current = false;
					});
				} else {
					requestAnimationFrame(() => {
						updateBlock(block.id, {
							startMinute: finalStart,
							durationMinutes: snappedDuration,
						});
						gestureActiveRef.current = false;
					});
				}
			};

			el.addEventListener("pointermove", onMove);
			el.addEventListener("pointerup", onUp);
			el.addEventListener("pointercancel", onUp);
		},
		[
			block,
			siblings,
			neighborAbove,
			motionTop,
			motionHeight,
			getNeighborMotion,
			updateBlock,
			updateBlocks,
		],
	);

	return {
		onBlockPointerDown,
		onTopHandlePointerDown,
		onBottomHandlePointerDown,
		gestureActiveRef,
	};
}

import { animate, type MotionValue } from "motion/react";
import { useCallback, useRef } from "react";
import { DAY_END_MINUTES, MINUTE_HEIGHT, SNAP_MINUTES } from "@/constants";
import { useStore } from "@/store";
import type { TimeBlock } from "@/types";
import {
	constrainMove,
	constrainResizeBottom,
	constrainResizeTop,
} from "@/utils/overlap";
import { formatTimeRange, snapMinutes } from "@/utils/time";

const SNAP_SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };
const LIFT_SPRING = { type: "spring" as const, stiffness: 400, damping: 28 };
const DETENT_SPRING = { type: "spring" as const, stiffness: 600, damping: 34 };

const MAX_SQUISH = 0.12;
const MOVE_THRESHOLD_PX = 4;

// How much the block leans toward the pointer between detents (0 = rigid)
const RESIDUAL_LEAN = 0.3;

const EDGE_SCROLL_ZONE = 48; // px from viewport edge where auto-scroll kicks in
const EDGE_SCROLL_MAX_SPEED = 14; // px per frame at the very edge

/** Motion values that drive gesture feedback (lift, squish, detent lean, time badge). */
export interface GestureVisuals {
	lift: MotionValue<number>;
	squish: MotionValue<number>;
	offsetTop: MotionValue<number>;
	offsetHeight: MotionValue<number>;
	timeLabel: MotionValue<string>;
}

/** Scrolls the day view when the pointer nears its top/bottom edge during a gesture. */
function createAutoScroller(scrollEl: HTMLElement | null, onStep: () => void) {
	let speed = 0;
	let raf = 0;

	const step = () => {
		if (!scrollEl || speed === 0) {
			raf = 0;
			return;
		}
		scrollEl.scrollTop += speed;
		onStep();
		raf = requestAnimationFrame(step);
	};

	return {
		update(clientY: number) {
			if (!scrollEl) return;
			const rect = scrollEl.getBoundingClientRect();
			const fromTop = clientY - rect.top;
			const fromBottom = rect.bottom - clientY;
			if (fromTop < EDGE_SCROLL_ZONE) {
				speed =
					-EDGE_SCROLL_MAX_SPEED *
					(1 - Math.max(0, fromTop) / EDGE_SCROLL_ZONE);
			} else if (fromBottom < EDGE_SCROLL_ZONE) {
				speed =
					EDGE_SCROLL_MAX_SPEED *
					(1 - Math.max(0, fromBottom) / EDGE_SCROLL_ZONE);
			} else {
				speed = 0;
			}
			if (speed !== 0 && raf === 0) raf = requestAnimationFrame(step);
		},
		stop() {
			speed = 0;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		},
	};
}

function findScrollContainer(el: HTMLElement): HTMLElement | null {
	return el.closest("[data-scroll-container]");
}

interface UseBlockGestureOptions {
	block: TimeBlock;
	siblings: TimeBlock[];
	neighborAbove: TimeBlock | null;
	neighborBelow: TimeBlock | null;
	motionTop: MotionValue<number>;
	motionHeight: MotionValue<number>;
	visuals: GestureVisuals;
	/** Fired when gesture feedback (time badge) should show/hide. */
	onGestureVisualChange?: (active: boolean) => void;
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
	visuals,
	onGestureVisualChange,
	getNeighborMotion,
	isEditing,
}: UseBlockGestureOptions) {
	const updateBlock = useStore((s) => s.updateBlock);
	const updateBlocks = useStore((s) => s.updateBlocks);
	const setDraggingBlock = useStore((s) => s.setDraggingBlock);
	const gestureActiveRef = useRef(false);
	const squishAnimRef = useRef<{ stop: () => void } | null>(null);

	// ── Drag ──────────────────────────────────────────────

	const onBlockPointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (isEditing) return;
			e.preventDefault();

			const el = e.currentTarget as HTMLElement;
			el.setPointerCapture(e.pointerId);

			const scrollEl = findScrollContainer(el);
			const startScrollTop = scrollEl?.scrollTop ?? 0;
			const startY = e.clientY;
			const initialStart = block.startMinute;
			const duration = block.durationMinutes;
			let currentStart = initialStart;
			let lastSnapped = initialStart;
			let lastClientY = startY;
			let moved = false;

			gestureActiveRef.current = true;
			setDraggingBlock(true);

			squishAnimRef.current?.stop();
			squishAnimRef.current = null;
			animate(visuals.lift, 1, LIFT_SPRING);

			const beginMove = () => {
				moved = true;
				onGestureVisualChange?.(true);
			};

			const applyPointer = () => {
				const scrollDelta = (scrollEl?.scrollTop ?? 0) - startScrollTop;
				const deltaMinutes =
					(lastClientY - startY + scrollDelta) / MINUTE_HEIGHT;
				const proposed = initialStart + deltaMinutes;
				currentStart = constrainMove(duration, proposed, siblings);

				// Detent motion: the block springs between snap slots so it
				// always sits where it will land...
				const snapped = Math.max(
					0,
					Math.min(DAY_END_MINUTES - duration, snapMinutes(currentStart)),
				);
				if (snapped !== lastSnapped) {
					lastSnapped = snapped;
					animate(motionTop, snapped * MINUTE_HEIGHT, DETENT_SPRING);
					visuals.timeLabel.set(formatTimeRange(snapped, snapped + duration));
				}
				// ...while leaning slightly toward the pointer in between
				visuals.offsetTop.set(
					(currentStart - snapped) * MINUTE_HEIGHT * RESIDUAL_LEAN,
				);

				// Collision squish (signed: positive = pushing down)
				const diff = proposed - currentStart;
				if (Math.abs(diff) > 0.5) {
					squishAnimRef.current?.stop();
					squishAnimRef.current = null;
					const magnitude = Math.min(
						MAX_SQUISH,
						Math.abs(diff) * MINUTE_HEIGHT * 0.02,
					);
					visuals.squish.set(diff > 0 ? magnitude : -magnitude);
				} else if (visuals.squish.get() !== 0 && !squishAnimRef.current) {
					squishAnimRef.current = animate(visuals.squish, 0, {
						...SNAP_SPRING,
						onComplete: () => {
							squishAnimRef.current = null;
						},
					});
				}
			};

			const scroller = createAutoScroller(scrollEl, applyPointer);

			const onMove = (ev: PointerEvent) => {
				lastClientY = ev.clientY;
				if (!moved && Math.abs(ev.clientY - startY) > MOVE_THRESHOLD_PX)
					beginMove();
				if (moved) scroller.update(ev.clientY);
				applyPointer();
			};

			const onUp = () => {
				el.removeEventListener("pointermove", onMove);
				el.removeEventListener("pointerup", onUp);
				el.removeEventListener("pointercancel", onUp);
				scroller.stop();

				const snapped = snapMinutes(currentStart);
				const clamped = Math.max(
					0,
					Math.min(DAY_END_MINUTES - duration, snapped),
				);

				animate(motionTop, clamped * MINUTE_HEIGHT, SNAP_SPRING);
				animate(visuals.offsetTop, 0, SNAP_SPRING);
				animate(visuals.lift, 0, LIFT_SPRING);
				if (visuals.squish.get() !== 0) {
					squishAnimRef.current?.stop();
					squishAnimRef.current = animate(visuals.squish, 0, SNAP_SPRING);
				}
				onGestureVisualChange?.(false);

				// Small delay to let animation start before committing store
				requestAnimationFrame(() => {
					updateBlock(block.id, { startMinute: clamped });
					gestureActiveRef.current = false;
					setDraggingBlock(false);
				});
			};

			el.addEventListener("pointermove", onMove);
			el.addEventListener("pointerup", onUp);
			el.addEventListener("pointercancel", onUp);
		},
		[
			isEditing,
			block,
			siblings,
			motionTop,
			visuals,
			onGestureVisualChange,
			updateBlock,
			setDraggingBlock,
		],
	);

	// ── Resize Bottom ────────────────────────────────────

	const onBottomHandlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();

			const el = e.currentTarget as HTMLElement;
			el.setPointerCapture(e.pointerId);

			const scrollEl = findScrollContainer(el);
			const startScrollTop = scrollEl?.scrollTop ?? 0;
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
			let lastSnappedDuration = initialDuration;
			let lastClientY = startY;
			let moved = false;
			gestureActiveRef.current = true;
			setDraggingBlock(true);

			const neighborMotion = isShared
				? getNeighborMotion(neighborBelow.id)
				: undefined;

			const beginMove = () => {
				moved = true;
				onGestureVisualChange?.(true);
			};

			const applyDetent = (snappedDuration: number) => {
				animate(motionHeight, snappedDuration * MINUTE_HEIGHT, DETENT_SPRING);
				if (isShared && neighborMotion) {
					const newNeighborStart = block.startMinute + snappedDuration;
					const newNeighborDuration =
						blockEnd +
						neighborInitialDuration -
						block.startMinute -
						snappedDuration;
					animate(
						neighborMotion.top,
						newNeighborStart * MINUTE_HEIGHT,
						DETENT_SPRING,
					);
					animate(
						neighborMotion.height,
						newNeighborDuration * MINUTE_HEIGHT,
						DETENT_SPRING,
					);
				}
				visuals.timeLabel.set(
					formatTimeRange(
						block.startMinute,
						block.startMinute + snappedDuration,
					),
				);
			};

			const applyPointer = () => {
				const scrollDelta = (scrollEl?.scrollTop ?? 0) - startScrollTop;
				const deltaMinutes =
					(lastClientY - startY + scrollDelta) / MINUTE_HEIGHT;
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
				if (snappedDuration !== lastSnappedDuration) {
					lastSnappedDuration = snappedDuration;
					applyDetent(snappedDuration);
				}
				visuals.offsetHeight.set(
					(currentDuration - snappedDuration) * MINUTE_HEIGHT * RESIDUAL_LEAN,
				);
			};

			const scroller = createAutoScroller(scrollEl, applyPointer);

			const onMove = (ev: PointerEvent) => {
				lastClientY = ev.clientY;
				if (!moved && Math.abs(ev.clientY - startY) > MOVE_THRESHOLD_PX)
					beginMove();
				if (moved) scroller.update(ev.clientY);
				applyPointer();
			};

			const onUp = () => {
				el.removeEventListener("pointermove", onMove);
				el.removeEventListener("pointerup", onUp);
				el.removeEventListener("pointercancel", onUp);
				scroller.stop();

				const snappedDuration = Math.max(
					SNAP_MINUTES,
					snapMinutes(currentDuration),
				);

				animate(visuals.offsetHeight, 0, SNAP_SPRING);
				onGestureVisualChange?.(false);

				if (isShared) {
					const newNeighborStart = block.startMinute + snappedDuration;
					const newNeighborDuration =
						blockEnd +
						neighborInitialDuration -
						block.startMinute -
						snappedDuration;
					const snappedNeighborDuration = Math.max(
						SNAP_MINUTES,
						snapMinutes(newNeighborDuration),
					);

					animate(motionHeight, snappedDuration * MINUTE_HEIGHT, SNAP_SPRING);
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
						setDraggingBlock(false);
					});
				} else {
					animate(motionHeight, snappedDuration * MINUTE_HEIGHT, SNAP_SPRING);
					requestAnimationFrame(() => {
						updateBlock(block.id, {
							durationMinutes: snappedDuration,
						});
						gestureActiveRef.current = false;
						setDraggingBlock(false);
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
			visuals,
			onGestureVisualChange,
			getNeighborMotion,
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

			const el = e.currentTarget as HTMLElement;
			el.setPointerCapture(e.pointerId);

			const scrollEl = findScrollContainer(el);
			const startScrollTop = scrollEl?.scrollTop ?? 0;
			const startY = e.clientY;
			const initialStart = block.startMinute;
			const blockEnd = block.startMinute + block.durationMinutes;
			const isShared = neighborAbove != null;
			const neighborStart = neighborAbove?.startMinute ?? 0;

			const effectiveSiblings = isShared
				? siblings.filter((s) => s.id !== neighborAbove.id)
				: siblings;

			let currentStart = initialStart;
			let lastFinalStart = initialStart;
			let lastClientY = startY;
			let moved = false;
			gestureActiveRef.current = true;
			setDraggingBlock(true);

			const neighborMotion = isShared
				? getNeighborMotion(neighborAbove.id)
				: undefined;

			const beginMove = () => {
				moved = true;
				onGestureVisualChange?.(true);
			};

			const applyDetent = (finalStart: number, snappedDur: number) => {
				animate(motionTop, finalStart * MINUTE_HEIGHT, DETENT_SPRING);
				animate(motionHeight, snappedDur * MINUTE_HEIGHT, DETENT_SPRING);
				if (isShared && neighborMotion) {
					animate(
						neighborMotion.height,
						(finalStart - neighborStart) * MINUTE_HEIGHT,
						DETENT_SPRING,
					);
				}
				visuals.timeLabel.set(formatTimeRange(finalStart, blockEnd));
			};

			const applyPointer = () => {
				const scrollDelta = (scrollEl?.scrollTop ?? 0) - startScrollTop;
				const deltaMinutes =
					(lastClientY - startY + scrollDelta) / MINUTE_HEIGHT;
				const proposedStart = initialStart + deltaMinutes;

				if (isShared) {
					const minStart = neighborStart + SNAP_MINUTES;
					const maxStart = blockEnd - SNAP_MINUTES;
					currentStart = Math.max(minStart, Math.min(proposedStart, maxStart));
				} else {
					currentStart = constrainResizeTop(
						blockEnd,
						proposedStart,
						effectiveSiblings,
					).startMinute;
				}

				const snappedStart = snapMinutes(currentStart);
				const snappedDur = Math.max(SNAP_MINUTES, blockEnd - snappedStart);
				const finalStart = blockEnd - snappedDur;
				if (finalStart !== lastFinalStart) {
					lastFinalStart = finalStart;
					applyDetent(finalStart, snappedDur);
				}
				const residual =
					(currentStart - finalStart) * MINUTE_HEIGHT * RESIDUAL_LEAN;
				visuals.offsetTop.set(residual);
				visuals.offsetHeight.set(-residual);
			};

			const scroller = createAutoScroller(scrollEl, applyPointer);

			const onMove = (ev: PointerEvent) => {
				lastClientY = ev.clientY;
				if (!moved && Math.abs(ev.clientY - startY) > MOVE_THRESHOLD_PX)
					beginMove();
				if (moved) scroller.update(ev.clientY);
				applyPointer();
			};

			const onUp = () => {
				el.removeEventListener("pointermove", onMove);
				el.removeEventListener("pointerup", onUp);
				el.removeEventListener("pointercancel", onUp);
				scroller.stop();

				const snappedStart = snapMinutes(currentStart);
				const snappedDuration = Math.max(SNAP_MINUTES, blockEnd - snappedStart);
				const finalStart = blockEnd - snappedDuration;

				animate(motionTop, finalStart * MINUTE_HEIGHT, SNAP_SPRING);
				animate(motionHeight, snappedDuration * MINUTE_HEIGHT, SNAP_SPRING);
				animate(visuals.offsetTop, 0, SNAP_SPRING);
				animate(visuals.offsetHeight, 0, SNAP_SPRING);
				onGestureVisualChange?.(false);

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
						setDraggingBlock(false);
					});
				} else {
					requestAnimationFrame(() => {
						updateBlock(block.id, {
							startMinute: finalStart,
							durationMinutes: snappedDuration,
						});
						gestureActiveRef.current = false;
						setDraggingBlock(false);
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
			visuals,
			onGestureVisualChange,
			getNeighborMotion,
			updateBlock,
			updateBlocks,
			setDraggingBlock,
		],
	);

	return {
		onBlockPointerDown,
		onTopHandlePointerDown,
		onBottomHandlePointerDown,
		gestureActiveRef,
	};
}

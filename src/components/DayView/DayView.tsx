import {
	type MotionValue,
	motion,
	useMotionValue,
	useSpring,
} from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { NowLine } from "@/components/NowLine";
import { TimeBlock } from "@/components/TimeBlock";
import { TimeGrid } from "@/components/TimeGrid";
import {
	BLOCK_GAP,
	DAY_END_MINUTES,
	DEFAULT_VIEW_START,
	FOLLOW_SPRING,
	MINUTE_HEIGHT,
	SNAP_MINUTES,
	SNAP_PX,
	type ThemeSwatch,
	TOTAL_DAY_HEIGHT,
} from "@/constants";
import { useThemePalette } from "@/hooks/useThemePalette";
import { useStore } from "@/store";
import type { TimeBlock as TimeBlockType } from "@/types";
import { startVerticalGesture } from "@/utils/gesture";
import {
	formatDateToISO,
	formatTimeRange,
	pxToSnappedMinutes,
} from "@/utils/time";
import styles from "./DayView.module.scss";

interface DayViewProps {
	date: string;
	/** Arms the day-swipe drag; only called for empty-grid pointerdowns. */
	onSwipeStart?: (e: React.PointerEvent) => void;
}

export function DayView({ date, onSwipeStart }: DayViewProps) {
	const blocks = useStore(
		useShallow((s) => s.blocks.filter((b) => b.date === date)),
	);
	const addBlock = useStore((s) => s.addBlock);
	const setDraggingBlock = useStore((s) => s.setDraggingBlock);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [newBlockId, setNewBlockId] = useState<string | null>(null);

	const palette = useThemePalette();

	// Draft state for drag-to-create. Targets snap in minute increments; the
	// springs render them so the draft grows smoothly, matching block gestures.
	const [draftSwatch, setDraftSwatch] = useState<ThemeSwatch | null>(null);
	const [draftRange, setDraftRange] = useState("");
	const draftTopTarget = useMotionValue(0);
	const draftHeightTarget = useMotionValue(0);
	const draftTop = useSpring(draftTopTarget, FOLLOW_SPRING);
	const draftHeight = useSpring(draftHeightTarget, FOLLOW_SPRING);

	// Sort blocks by startMinute
	const sorted = useMemo(
		() => [...blocks].sort((a, b) => a.startMinute - b.startMinute),
		[blocks],
	);

	// Compute adjacency (shared borders)
	const adjacency = useMemo(() => {
		const map = new Map<
			string,
			{ above: TimeBlockType | null; below: TimeBlockType | null }
		>();
		for (let i = 0; i < sorted.length; i++) {
			const block = sorted[i];
			const prev = sorted[i - 1];
			const next = sorted[i + 1];
			const above =
				prev && prev.startMinute + prev.durationMinutes === block.startMinute
					? prev
					: null;
			const below =
				next && block.startMinute + block.durationMinutes === next.startMinute
					? next
					: null;
			map.set(block.id, { above, below });
		}
		return map;
	}, [sorted]);

	// Per-block gesture target registry (ref-based, no re-renders)
	const targetRegistry = useRef(
		new Map<
			string,
			{ top: MotionValue<number>; height: MotionValue<number> }
		>(),
	);

	const registerTargets = useCallback(
		(id: string, top: MotionValue<number>, height: MotionValue<number>) => {
			targetRegistry.current.set(id, { top, height });
		},
		[],
	);

	const getNeighborTargets = useCallback(
		(id: string) => targetRegistry.current.get(id),
		[],
	);

	const isToday = date === formatDateToISO(new Date());

	// Scroll to now (today) or the default view start (other days)
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const now = new Date();
		if (date === formatDateToISO(now)) {
			const nowMinutes = now.getHours() * 60 + now.getMinutes();
			el.scrollTo({
				top: Math.max(0, nowMinutes * MINUTE_HEIGHT - el.clientHeight / 3),
			});
		} else {
			el.scrollTo({ top: DEFAULT_VIEW_START * MINUTE_HEIGHT });
		}
	}, [date]);

	// Pointerdown on empty grid shows the snapped 15-min draft slot right away,
	// so the creation origin is always visible. Release commits it (a plain
	// click creates the slot); dragging vertically grows it within the free
	// gap; horizontal intent aborts and yields to the day-swipe gesture.
	const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.target !== e.currentTarget) return;
		if (e.button !== 0) return;

		// A click that ends a label edit should only blur the input,
		// not simultaneously create a new block.
		const active = document.activeElement;
		if (active instanceof HTMLInputElement) return;

		// Arm the horizontal day-swipe. Vertical intent grows the draft below;
		// dragDirectionLock keeps the swipe from translating in that case.
		onSwipeStart?.(e);

		const container = e.currentTarget;
		const rect = container.getBoundingClientRect();
		const anchorMinute = Math.max(
			0,
			Math.min(
				DAY_END_MINUTES - SNAP_MINUTES,
				pxToSnappedMinutes(e.clientY - rect.top),
			),
		);
		const anchorEnd = anchorMinute + SNAP_MINUTES;

		// Find the free gap containing the anchor slot
		let gapLo = 0;
		let gapHi = DAY_END_MINUTES;
		let anchorFree = true;
		for (const b of sorted) {
			const bEnd = b.startMinute + b.durationMinutes;
			if (bEnd <= anchorMinute) gapLo = Math.max(gapLo, bEnd);
			else if (b.startMinute >= anchorEnd)
				gapHi = Math.min(gapHi, b.startMinute);
			else anchorFree = false;
		}
		if (!anchorFree) return;

		let dragStart = anchorMinute;
		let dragEnd = anchorEnd;

		// Show the anchor slot immediately. Jump the spring followers too:
		// jumping only the source targets makes the followers *animate* from
		// their stale position (the previous draft), not render in place.
		const anchorTopPx = anchorMinute * MINUTE_HEIGHT;
		const anchorHeightPx = SNAP_PX - BLOCK_GAP;
		setDraftSwatch(palette[useStore.getState().nextColorIndex]);
		draftTopTarget.jump(anchorTopPx);
		draftHeightTarget.jump(anchorHeightPx);
		draftTop.jump(anchorTopPx);
		draftHeight.jump(anchorHeightPx);
		setDraftRange(formatTimeRange(dragStart, dragEnd));

		const updateDraft = (clientY: number) => {
			const y = clientY - container.getBoundingClientRect().top;
			const pointerMinute = y / MINUTE_HEIGHT;
			if (pointerMinute >= anchorMinute) {
				dragStart = anchorMinute;
				dragEnd = Math.min(
					gapHi,
					Math.max(
						anchorEnd,
						Math.ceil(pointerMinute / SNAP_MINUTES) * SNAP_MINUTES,
					),
				);
			} else {
				dragEnd = anchorEnd;
				dragStart = Math.max(
					gapLo,
					Math.min(
						anchorMinute,
						Math.floor(pointerMinute / SNAP_MINUTES) * SNAP_MINUTES,
					),
				);
			}
			draftTopTarget.set(dragStart * MINUTE_HEIGHT);
			draftHeightTarget.set((dragEnd - dragStart) * MINUTE_HEIGHT - BLOCK_GAP);
			setDraftRange(formatTimeRange(dragStart, dragEnd));
		};

		startVerticalGesture(e, {
			// Horizontal intent means a day swipe: hand the pointer back
			shouldBegin: (dx, dy) => dy >= dx,
			onBegin: () => setDraggingBlock(true),
			onUpdate: ({ clientY, began }) => {
				if (began) updateDraft(clientY);
			},
			onAbort: () => setDraftSwatch(null),
			onEnd: ({ began, cancelled }) => {
				if (began) setDraggingBlock(false);
				setDraftSwatch(null);
				if (cancelled) return;
				const id = addBlock(date, dragStart, dragEnd - dragStart);
				setNewBlockId(id);
			},
		});
	};

	return (
		<div className={styles.dayView} ref={scrollRef} data-scroll-container>
			{sorted.length === 0 && !draftSwatch && (
				<div className={styles.emptyHint}>
					<span className={styles.emptyHintText}>
						Click anywhere to add a block · drag to size it
					</span>
				</div>
			)}
			<div
				className={styles.dayViewInner}
				style={{ height: TOTAL_DAY_HEIGHT }}
				onPointerDown={handleGridPointerDown}
			>
				<TimeGrid />
				{isToday && <NowLine />}
				{draftSwatch && (
					<motion.div
						className={styles.draftBlock}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.12 }}
						style={{
							top: draftTop,
							height: draftHeight,
							borderColor: draftSwatch.bg,
							backgroundColor: draftSwatch.bg,
							color: draftSwatch.text,
						}}
					>
						<span className={styles.draftLabel}>{draftRange}</span>
					</motion.div>
				)}
				{sorted.map((block) => {
					const adj = adjacency.get(block.id);
					return (
						<TimeBlock
							key={block.id}
							block={block}
							autoFocus={block.id === newBlockId}
							onFocused={() => setNewBlockId(null)}
							neighborAbove={adj?.above ?? null}
							neighborBelow={adj?.below ?? null}
							siblings={sorted.filter((b) => b.id !== block.id)}
							registerTargets={registerTargets}
							getNeighborTargets={getNeighborTargets}
						/>
					);
				})}
			</div>
		</div>
	);
}

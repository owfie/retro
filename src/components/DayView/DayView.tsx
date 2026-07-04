import { type MotionValue, motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { NowLine } from "@/components/NowLine";
import { TimeBlock } from "@/components/TimeBlock";
import { TimeGrid } from "@/components/TimeGrid";
import {
	COLOR_PALETTE,
	DAY_END_MINUTES,
	DEFAULT_BLOCK_DURATION,
	DEFAULT_VIEW_START,
	MINUTE_HEIGHT,
	SNAP_MINUTES,
	TOTAL_DAY_HEIGHT,
} from "@/constants";
import { useStore } from "@/store";
import type { TimeBlock as TimeBlockType } from "@/types";
import { findNearestGap } from "@/utils/overlap";
import {
	formatDateToISO,
	formatTimeRange,
	pxToSnappedMinutes,
} from "@/utils/time";
import styles from "./DayView.module.scss";

const MOVE_THRESHOLD_PX = 4;

interface DayViewProps {
	date: string;
}

export function DayView({ date }: DayViewProps) {
	const blocks = useStore(
		useShallow((s) => s.blocks.filter((b) => b.date === date)),
	);
	const addBlock = useStore((s) => s.addBlock);
	const setDraggingBlock = useStore((s) => s.setDraggingBlock);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [newBlockId, setNewBlockId] = useState<string | null>(null);
	const skipNextClickRef = useRef(false);

	// Draft state for drag-to-create
	const [draftColor, setDraftColor] = useState<string | null>(null);
	const [draftRange, setDraftRange] = useState("");
	const draftTop = useMotionValue(0);
	const draftHeight = useMotionValue(0);

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

	// Motion value registry (ref-based, no re-renders)
	const motionRegistry = useRef(
		new Map<
			string,
			{ top: MotionValue<number>; height: MotionValue<number> }
		>(),
	);

	const registerMotionValues = useCallback(
		(id: string, top: MotionValue<number>, height: MotionValue<number>) => {
			motionRegistry.current.set(id, { top, height });
		},
		[],
	);

	const getNeighborMotion = useCallback(
		(id: string) => motionRegistry.current.get(id),
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

	const handleEditEnd = useCallback(() => {
		skipNextClickRef.current = true;
	}, []);

	// Click to create a default block; drag vertically to size it while creating
	const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.target !== e.currentTarget) return;
		if (e.button !== 0) return;

		const container = e.currentTarget;
		const startClientX = e.clientX;
		const startClientY = e.clientY;

		const rect = container.getBoundingClientRect();
		const anchorMinute = Math.max(
			0,
			Math.min(
				DAY_END_MINUTES - SNAP_MINUTES,
				pxToSnappedMinutes(startClientY - rect.top),
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

		let dragStart = anchorMinute;
		let dragEnd = anchorEnd;
		let mode: "idle" | "creating" | "aborted" = "idle";
		container.setPointerCapture(e.pointerId);

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
			draftTop.set(dragStart * MINUTE_HEIGHT);
			draftHeight.set((dragEnd - dragStart) * MINUTE_HEIGHT - 2);
			setDraftRange(formatTimeRange(dragStart, dragEnd));
		};

		const cleanup = () => {
			container.removeEventListener("pointermove", onMove);
			container.removeEventListener("pointerup", onUp);
			container.removeEventListener("pointercancel", onCancel);
		};

		const onMove = (ev: PointerEvent) => {
			if (mode === "aborted") return;
			if (mode === "idle") {
				const dx = Math.abs(ev.clientX - startClientX);
				const dy = Math.abs(ev.clientY - startClientY);
				if (dx < MOVE_THRESHOLD_PX && dy < MOVE_THRESHOLD_PX) return;
				// Horizontal intent (day swipe) or occupied slot: leave it alone
				if (dx > dy || !anchorFree) {
					mode = "aborted";
					return;
				}
				mode = "creating";
				setDraggingBlock(true);
				setDraftColor(COLOR_PALETTE[useStore.getState().nextColorIndex]);
			}
			updateDraft(ev.clientY);
		};

		const onUp = () => {
			cleanup();
			if (mode === "creating") {
				setDraggingBlock(false);
				setDraftColor(null);
				const id = addBlock(date, dragStart, dragEnd - dragStart);
				setNewBlockId(id);
				return;
			}
			if (mode === "aborted") return;
			// Plain click
			if (skipNextClickRef.current) {
				skipNextClickRef.current = false;
				return;
			}
			const validStart = findNearestGap(
				anchorMinute,
				DEFAULT_BLOCK_DURATION,
				sorted,
			);
			if (validStart != null) {
				const id = addBlock(date, validStart);
				setNewBlockId(id);
			}
		};

		const onCancel = () => {
			cleanup();
			if (mode === "creating") {
				setDraggingBlock(false);
				setDraftColor(null);
			}
		};

		container.addEventListener("pointermove", onMove);
		container.addEventListener("pointerup", onUp);
		container.addEventListener("pointercancel", onCancel);
	};

	return (
		<div className={styles.dayView} ref={scrollRef} data-scroll-container>
			{sorted.length === 0 && !draftColor && (
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
				{draftColor && (
					<motion.div
						className={styles.draftBlock}
						style={{
							top: draftTop,
							height: draftHeight,
							borderColor: draftColor,
							backgroundColor: draftColor,
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
							onEditEnd={handleEditEnd}
							registerMotionValues={registerMotionValues}
							getNeighborMotion={getNeighborMotion}
						/>
					);
				})}
			</div>
		</div>
	);
}

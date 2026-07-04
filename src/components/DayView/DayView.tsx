import {
	DEFAULT_BLOCK_DURATION,
	DEFAULT_VIEW_START,
	MINUTE_HEIGHT,
	TOTAL_DAY_HEIGHT,
} from "@/constants";
import { TimeBlock } from "@/components/TimeBlock";
import { TimeGrid } from "@/components/TimeGrid";
import { useStore } from "@/store";
import type { TimeBlock as TimeBlockType } from "@/types";
import { findNearestGap } from "@/utils/overlap";
import { pxToSnappedMinutes } from "@/utils/time";
import type { MotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import styles from "./DayView.module.scss";

interface DayViewProps {
	date: string;
}

export function DayView({ date }: DayViewProps) {
	const blocks = useStore(
		useShallow((s) => s.blocks.filter((b) => b.date === date)),
	);
	const addBlock = useStore((s) => s.addBlock);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [newBlockId, setNewBlockId] = useState<string | null>(null);
	const skipNextClickRef = useRef(false);

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
				prev &&
				prev.startMinute + prev.durationMinutes === block.startMinute
					? prev
					: null;
			const below =
				next &&
				block.startMinute + block.durationMinutes === next.startMinute
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
		(
			id: string,
			top: MotionValue<number>,
			height: MotionValue<number>,
		) => {
			motionRegistry.current.set(id, { top, height });
		},
		[],
	);

	const getNeighborMotion = useCallback(
		(id: string) => motionRegistry.current.get(id),
		[],
	);

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: DEFAULT_VIEW_START * MINUTE_HEIGHT,
		});
	}, [date]);

	const handleEditEnd = useCallback(() => {
		skipNextClickRef.current = true;
	}, []);

	const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (skipNextClickRef.current) {
			skipNextClickRef.current = false;
			return;
		}
		if (e.target !== e.currentTarget) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const scrollTop = e.currentTarget.scrollTop;
		const clickY = e.clientY - rect.top + scrollTop;
		const snappedMinute = pxToSnappedMinutes(clickY);

		const validStart = findNearestGap(
			snappedMinute,
			DEFAULT_BLOCK_DURATION,
			sorted,
		);
		if (validStart != null) {
			const id = addBlock(date, validStart);
			setNewBlockId(id);
		}
	};

	return (
		<div className={styles.dayView} ref={scrollRef}>
			<div
				className={styles.dayViewInner}
				style={{ height: TOTAL_DAY_HEIGHT }}
				onClick={handleGridClick}
			>
				<TimeGrid />
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
							siblings={sorted.filter(
								(b) => b.id !== block.id,
							)}
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

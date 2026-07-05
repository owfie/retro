import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { AnimatedSegment } from "@/components/AnimatedTimeRange/AnimatedTimeRange";
import { useThemePalette } from "@/hooks/useThemePalette";
import { useStore } from "@/store";
import type { TimeBlock } from "@/types";
import {
	getItemCountLabelSegments,
	getTotalHoursLabelSegments,
} from "@/utils/time";
import styles from "./DaySummaryVisualizer.module.scss";

const SEGMENT_HEIGHT = 4;
const DRAFT_BLOCK_ID = "__draft__";

const TWEEN = {
	type: "tween",
	duration: 0.2,
	ease: [0.4, 0, 0.2, 1],
} as const;

const SEGMENT_TRANSITION = {
	layout: TWEEN,
	flexGrow: TWEEN,
	opacity: TWEEN,
};

interface DaySummaryVisualizerProps {
	date: string;
}

function mergeLiveBlocks(
	blocks: TimeBlock[],
	livePreviews: Record<string, { startMinute: number; durationMinutes: number }>,
	draftPreview: {
		date: string;
		startMinute: number;
		durationMinutes: number;
		colorIndex: number;
	} | null,
	date: string,
): TimeBlock[] {
	const merged = blocks.map((block) => {
		const live = livePreviews[block.id];
		return live ? { ...block, ...live } : block;
	});

	if (draftPreview?.date === date) {
		merged.push({
			id: DRAFT_BLOCK_ID,
			date,
			startMinute: draftPreview.startMinute,
			durationMinutes: draftPreview.durationMinutes,
			label: "",
			colorIndex: draftPreview.colorIndex,
		});
	}

	return merged.sort((a, b) => a.startMinute - b.startMinute);
}

export function DaySummaryVisualizer({ date }: DaySummaryVisualizerProps) {
	const blocks = useStore(
		useShallow((s) => s.blocks.filter((b) => b.date === date)),
	);
	const livePreviews = useStore((s) => s.blockLivePreviews);
	const draftPreview = useStore((s) => s.draftBlockPreview);
	const palette = useThemePalette();

	const sorted = useMemo(
		() => mergeLiveBlocks(blocks, livePreviews, draftPreview, date),
		[blocks, livePreviews, draftPreview, date],
	);

	if (sorted.length === 0) return null;

	const totalMinutes = sorted.reduce(
		(sum, block) => sum + block.durationMinutes,
		0,
	);
	const itemCount = sorted.length;
	const itemLabel = getItemCountLabelSegments(itemCount);
	const durationLabel = getTotalHoursLabelSegments(totalMinutes);

	return (
		<motion.div
			className={styles.visualizer}
			layout
			transition={{ layout: TWEEN }}
		>
			<LayoutGroup id={`summary-${date}`}>
				<motion.div
					layout
					className={styles.bar}
					style={{ gap: SEGMENT_HEIGHT, height: SEGMENT_HEIGHT }}
					transition={{ layout: TWEEN }}
				>
					<AnimatePresence initial={false} mode="popLayout">
						{sorted.map((block) => (
							<motion.div
								key={block.id}
								layout
								className={styles.segment}
								initial={{ opacity: 0, flexGrow: 0 }}
								animate={{
									opacity: 1,
									flexGrow: block.durationMinutes,
								}}
								exit={{ opacity: 0, flexGrow: 0 }}
								transition={SEGMENT_TRANSITION}
								style={{
									backgroundColor: palette[block.colorIndex].bg,
								}}
							/>
						))}
					</AnimatePresence>
				</motion.div>
			</LayoutGroup>
			<motion.div
				layout
				className={styles.meta}
				transition={{ layout: TWEEN }}
			>
				<span className={styles.metaLabel}>
					<AnimatedSegment value={itemLabel.value} />
					{itemLabel.suffix}
				</span>
				<span className={styles.metaLabel}>
					<AnimatedSegment value={durationLabel.value} />
					{durationLabel.suffix}
				</span>
			</motion.div>
		</motion.div>
	);
}

import { AnimatePresence, motion } from "motion/react";
import { formatDurationLabel, getDurationLabelSegments } from "@/utils/time";
import styles from "./AnimatedTimeRange.module.scss";

const TICK_SPRING = {
	type: "spring" as const,
	stiffness: 520,
	damping: 36,
	mass: 0.55,
};

function AnimatedSegment({ value }: { value: string }) {
	return (
		<span className={styles.segment}>
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.span
					key={value}
					className={styles.segmentValue}
					initial={{ y: "100%", opacity: 0 }}
					animate={{ y: "0%", opacity: 1 }}
					exit={{ y: "-100%", opacity: 0 }}
					transition={TICK_SPRING}
				>
					{value}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

function DurationLabel({
	durationMinutes,
	animate,
}: {
	durationMinutes: number;
	animate: boolean;
}) {
	const { hours, minutes } = getDurationLabelSegments(durationMinutes);

	if (!animate) {
		return (
			<>
				{hours}
				{hours && minutes ? " " : null}
				{minutes}
			</>
		);
	}

	return (
		<>
			{hours && <AnimatedSegment value={hours} />}
			{hours && minutes && <span className={styles.separator}> </span>}
			{minutes && <AnimatedSegment value={minutes} />}
		</>
	);
}

interface AnimatedTimeRangeProps {
	startMinute: number;
	endMinute: number;
	animate?: boolean;
	className?: string;
}

export function AnimatedTimeRange({
	startMinute,
	endMinute,
	animate = false,
	className,
}: AnimatedTimeRangeProps) {
	const durationMinutes = endMinute - startMinute;

	if (!animate) {
		return (
			<span className={[styles.root, className].filter(Boolean).join(" ")}>
				{formatDurationLabel(durationMinutes)}
			</span>
		);
	}

	return (
		<span className={[styles.root, className].filter(Boolean).join(" ")}>
			<DurationLabel durationMinutes={durationMinutes} animate />
		</span>
	);
}

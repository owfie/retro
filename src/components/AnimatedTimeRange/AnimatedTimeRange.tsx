import { AnimatePresence, motion } from "motion/react";
import { formatTimeRange, getTimeLabelSegments } from "@/utils/time";
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

function TimeLabel({
	totalMinutes,
	includePeriod,
	animate,
}: {
	totalMinutes: number;
	includePeriod: boolean;
	animate: boolean;
}) {
	const { hour, minutes, period } = getTimeLabelSegments(
		totalMinutes,
		includePeriod,
	);

	if (!animate) {
		return (
			<>
				{hour}
				{minutes}
				{period}
			</>
		);
	}

	return (
		<>
			<AnimatedSegment value={hour} />
			{minutes && <AnimatedSegment value={minutes} />}
			{period && <AnimatedSegment value={period} />}
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
	if (!animate) {
		return (
			<span className={[styles.root, className].filter(Boolean).join(" ")}>
				{formatTimeRange(startMinute, endMinute)}
			</span>
		);
	}

	const startPeriod = Math.floor(startMinute / 60) % 24 < 12 ? "AM" : "PM";
	const endPeriod = Math.floor(endMinute / 60) % 24 < 12 ? "AM" : "PM";

	return (
		<span className={[styles.root, className].filter(Boolean).join(" ")}>
			<TimeLabel
				totalMinutes={startMinute}
				includePeriod={startPeriod !== endPeriod}
				animate
			/>
			<span className={styles.separator}> – </span>
			<TimeLabel totalMinutes={endMinute} includePeriod animate />
		</span>
	);
}

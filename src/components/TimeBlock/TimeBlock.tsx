import {
	motion,
	useMotionValue,
	useMotionValueEvent,
	useSpring,
	useTransform,
} from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	BLOCK_GAP,
	ENTRANCE_SPRING,
	FOLLOW_SPRING,
	LIFT_SPRING,
	MINUTE_HEIGHT,
	SQUISH_SPRING,
} from "@/constants";
import { AnimatedTimeRange } from "@/components/AnimatedTimeRange/AnimatedTimeRange";
import {
	type BlockGestureTargets,
	useBlockGesture,
	type LiveTimeRange,
	type ResizeEdge,
} from "@/hooks/useBlockGesture";
import { useThemePalette } from "@/hooks/useThemePalette";
import { useStore } from "@/store";
import type { TimeBlock as TimeBlockType } from "@/types";
import styles from "./TimeBlock.module.scss";

interface TimeBlockProps {
	block: TimeBlockType;
	autoFocus?: boolean;
	onFocused?: () => void;
	neighborAbove: TimeBlockType | null;
	neighborBelow: TimeBlockType | null;
	siblings: TimeBlockType[];
	registerTargets: (
		id: string,
		targets: BlockGestureTargets,
	) => void;
	getNeighborTargets: (id: string) => BlockGestureTargets | undefined;
}

export function TimeBlock({
	block,
	autoFocus,
	onFocused,
	neighborAbove,
	neighborBelow,
	siblings,
	registerTargets,
	getNeighborTargets,
}: TimeBlockProps) {
	const updateBlock = useStore((s) => s.updateBlock);
	const deleteBlock = useStore((s) => s.deleteBlock);

	const [isEditing, setIsEditing] = useState(false);
	const [localLabel, setLocalLabel] = useState(block.label);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const escapedRef = useRef(false);
	const isNewRef = useRef(false);

	const targetTop = useMotionValue(block.startMinute * MINUTE_HEIGHT);
	const targetHeight = useMotionValue(block.durationMinutes * MINUTE_HEIGHT);
	const liftTarget = useMotionValue(0);
	const squishTarget = useMotionValue(0);
	const liveRange = useMotionValue<LiveTimeRange | null>(null);
	const resizeEdgeActive = useMotionValue<ResizeEdge | null>(null);

	const top = useSpring(targetTop, FOLLOW_SPRING);
	const height = useSpring(targetHeight, FOLLOW_SPRING);
	const lift = useSpring(liftTarget, LIFT_SPRING);
	const squish = useSpring(squishTarget, SQUISH_SPRING);

	const entranceTarget = useMotionValue(autoFocus ? 0 : 1);
	const entrance = useSpring(entranceTarget, ENTRANCE_SPRING);
	useEffect(() => {
		entranceTarget.set(1);
	}, [entranceTarget]);

	const visuals = useMemo(
		() => ({
			lift: liftTarget,
			squish: squishTarget,
			liveRange,
			resizeEdgeActive,
		}),
		[liftTarget, squishTarget, liveRange, resizeEdgeActive],
	);

	const [gestureVisual, setGestureVisual] = useState(false);
	const [gestureTimes, setGestureTimes] = useState<LiveTimeRange | null>(null);
	const [activeEdge, setActiveEdge] = useState<ResizeEdge | null>(null);
	useMotionValueEvent(liveRange, "change", (v) => {
		setGestureTimes(v);
		setGestureVisual(v !== null);
	});
	useMotionValueEvent(resizeEdgeActive, "change", setActiveEdge);

	const beginEditing = useCallback(() => {
		setIsEditing(true);
		setTimeout(() => inputRef.current?.focus(), 0);
	}, []);

	const visualHeight = useTransform(height, (h) => h - BLOCK_GAP);

	const scale = useTransform(
		() => (1 + lift.get() * 0.02) * (0.96 + entrance.get() * 0.04),
	);
	const zIndex = useTransform(lift, (v) => (v > 0.02 ? 3 : 1));

	const scaleY = useTransform(squish, (s) => 1 - Math.abs(s));
	const contentScaleY = useTransform(squish, (s) =>
		Math.abs(s) > 0.001 ? 1 / (1 - Math.abs(s)) : 1,
	);
	const originY = useTransform(squish, (s) =>
		s > 0.001 ? 1 : s < -0.001 ? 0 : 0.5,
	);

	useEffect(() => {
		registerTargets(block.id, {
			top: targetTop,
			height: targetHeight,
			liveRange,
			resizeEdgeActive,
		});
	}, [
		block.id,
		targetTop,
		targetHeight,
		liveRange,
		resizeEdgeActive,
		registerTargets,
	]);

	const {
		onBlockPointerDown,
		onTopHandlePointerDown,
		onBottomHandlePointerDown,
	} = useBlockGesture({
		block,
		siblings,
		neighborAbove,
		neighborBelow,
		targetTop,
		targetHeight,
		visuals,
		onTap: beginEditing,
		getNeighborTargets,
		isEditing,
	});

	useEffect(() => {
		targetTop.set(block.startMinute * MINUTE_HEIGHT);
		targetHeight.set(block.durationMinutes * MINUTE_HEIGHT);
	}, [block.startMinute, block.durationMinutes, targetTop, targetHeight]);

	useEffect(() => {
		if (autoFocus) {
			isNewRef.current = true;
			beginEditing();
			onFocused?.();
		}
	}, [autoFocus, onFocused, beginEditing]);

	useEffect(() => {
		setLocalLabel(block.label);
	}, [block.label]);

	const saveLabel = () => {
		if (escapedRef.current) {
			escapedRef.current = false;
			return;
		}
		isNewRef.current = false;
		updateBlock(block.id, { label: localLabel.trim() });
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			saveLabel();
			inputRef.current?.blur();
		}
		if (e.key === "Escape") {
			escapedRef.current = true;
			if (isNewRef.current && !block.label) {
				deleteBlock(block.id);
				return;
			}
			setLocalLabel(block.label);
			setIsEditing(false);
			inputRef.current?.blur();
		}
	};

	const palette = useThemePalette();
	const swatch = palette[block.colorIndex % palette.length];
	const displayStart = gestureTimes?.start ?? block.startMinute;
	const displayEnd =
		gestureTimes?.end ?? block.startMinute + block.durationMinutes;

	return (
		<motion.div
			className={styles.timeBlock}
			data-resize-gesture={activeEdge ? "" : undefined}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.12 }}
			style={{
				top,
				height: visualHeight,
				scale,
				scaleY,
				originY,
				zIndex,
				borderColor: swatch.bg,
				backgroundColor: swatch.bg,
				color: swatch.text,
			}}
			onPointerDown={isEditing ? undefined : onBlockPointerDown}
		>
			<div
				className={styles.resizeHandle}
				data-edge="top"
				data-edge-active={activeEdge === "top" ? "" : undefined}
				onPointerDown={onTopHandlePointerDown}
			/>

			<motion.div
				className={styles.blockContent}
				style={{ scaleY: contentScaleY }}
			>
				{!isEditing && (
					<span
						className={styles.blockTime}
						data-visible={gestureVisual || undefined}
					>
						<AnimatedTimeRange
							startMinute={displayStart}
							endMinute={displayEnd}
							animate={gestureVisual}
						/>
					</span>
				)}
				{isEditing ? (
					<textarea
						ref={inputRef}
						className={styles.blockInput}
						value={localLabel}
						rows={1}
						onChange={(e) => setLocalLabel(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={saveLabel}
						onPointerDown={(e) => e.stopPropagation()}
					/>
				) : (
					<span className={styles.blockLabel} data-empty={!block.label}>
						{block.label || "Untitled"}
					</span>
				)}
				<button
					type="button"
					className={styles.deleteButton}
					aria-label="Delete block"
					onPointerDown={(e) => {
						e.stopPropagation();
						deleteBlock(block.id);
					}}
				>
					<svg
						aria-hidden="true"
						width="10"
						height="10"
						viewBox="0 0 10 10"
						stroke="currentColor"
						strokeWidth="1"
						strokeLinecap="round"
					>
						<line x1="2" y1="2" x2="8" y2="8" />
						<line x1="8" y1="2" x2="2" y2="8" />
					</svg>
				</button>
			</motion.div>

			<div
				className={styles.resizeHandle}
				data-edge="bottom"
				data-edge-active={activeEdge === "bottom" ? "" : undefined}
				onPointerDown={onBottomHandlePointerDown}
			/>
		</motion.div>
	);
}

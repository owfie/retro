import { MINUTE_HEIGHT } from "@/constants";
import { useBlockGesture } from "@/hooks/useBlockGesture";
import { useStore } from "@/store";
import type { TimeBlock as TimeBlockType } from "@/types";
import { type MotionValue, animate, motion, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import styles from "./TimeBlock.module.scss";

const SNAP_SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };

interface TimeBlockProps {
	block: TimeBlockType;
	autoFocus?: boolean;
	onFocused?: () => void;
	neighborAbove: TimeBlockType | null;
	neighborBelow: TimeBlockType | null;
	siblings: TimeBlockType[];
	registerMotionValues: (
		id: string,
		top: MotionValue<number>,
		height: MotionValue<number>,
	) => void;
	getNeighborMotion: (
		id: string,
	) => { top: MotionValue<number>; height: MotionValue<number> } | undefined;
}

export function TimeBlock({
	block,
	autoFocus,
	onFocused,
	neighborAbove,
	neighborBelow,
	siblings,
	registerMotionValues,
	getNeighborMotion,
}: TimeBlockProps) {
	const updateBlock = useStore((s) => s.updateBlock);
	const deleteBlock = useStore((s) => s.deleteBlock);

	const [isEditing, setIsEditing] = useState(false);
	const [localLabel, setLocalLabel] = useState(block.label);
	const inputRef = useRef<HTMLInputElement>(null);

	const motionTop = useMotionValue(block.startMinute * MINUTE_HEIGHT);
	const motionHeight = useMotionValue(block.durationMinutes * MINUTE_HEIGHT);

	// Register motion values with DayView for shared-border access
	useEffect(() => {
		registerMotionValues(block.id, motionTop, motionHeight);
	}, [block.id, motionTop, motionHeight, registerMotionValues]);

	const {
		onBlockPointerDown,
		onTopHandlePointerDown,
		onBottomHandlePointerDown,
		gestureActiveRef,
	} = useBlockGesture({
		block,
		siblings,
		neighborAbove,
		neighborBelow,
		motionTop,
		motionHeight,
		getNeighborMotion,
		isEditing,
	});

	// Sync motion values to store (guarded during gestures)
	useEffect(() => {
		if (!gestureActiveRef.current) {
			animate(motionTop, block.startMinute * MINUTE_HEIGHT, SNAP_SPRING);
			animate(
				motionHeight,
				block.durationMinutes * MINUTE_HEIGHT,
				SNAP_SPRING,
			);
		}
	}, [block.startMinute, block.durationMinutes, motionTop, motionHeight, gestureActiveRef]);

	// Auto-focus newly created blocks
	useEffect(() => {
		if (autoFocus) {
			setIsEditing(true);
			setTimeout(() => inputRef.current?.focus(), 0);
			onFocused?.();
		}
	}, [autoFocus, onFocused]);

	// Sync local label with store
	useEffect(() => {
		setLocalLabel(block.label);
	}, [block.label]);

	const saveLabel = () => {
		updateBlock(block.id, { label: localLabel });
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			saveLabel();
			inputRef.current?.blur();
		}
		if (e.key === "Escape") {
			setLocalLabel(block.label);
			setIsEditing(false);
			inputRef.current?.blur();
		}
	};

	return (
		<motion.div
			className={styles.timeBlock}
			style={{
				top: motionTop,
				height: motionHeight,
				borderColor: block.color,
			}}
			onPointerDown={isEditing ? undefined : onBlockPointerDown}
			onTap={() => {
				if (!isEditing) {
					setIsEditing(true);
					setTimeout(() => inputRef.current?.focus(), 0);
				}
			}}
		>
			{/* Top resize handle */}
			<div
				className={styles.resizeHandle}
				data-edge="top"
				onPointerDown={onTopHandlePointerDown}
			/>

			<div className={styles.blockContent}>
				{isEditing ? (
					<input
						ref={inputRef}
						className={styles.blockInput}
						value={localLabel}
						onChange={(e) => setLocalLabel(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={saveLabel}
						onPointerDown={(e) => e.stopPropagation()}
					/>
				) : (
					<span className={styles.blockLabel}>
						{block.label || "Untitled"}
					</span>
				)}
				<button
					type="button"
					className={styles.deleteButton}
					onPointerDown={(e) => {
						e.stopPropagation();
						deleteBlock(block.id);
					}}
				>
					&times;
				</button>
			</div>

			{/* Bottom resize handle */}
			<div
				className={styles.resizeHandle}
				data-edge="bottom"
				onPointerDown={onBottomHandlePointerDown}
			/>
		</motion.div>
	);
}

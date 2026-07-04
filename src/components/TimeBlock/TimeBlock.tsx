import { COLOR_PALETTE, MINUTE_HEIGHT } from "@/constants";
import { useBlockGesture } from "@/hooks/useBlockGesture";
import { useStore } from "@/store";
import type { TimeBlock as TimeBlockType } from "@/types";
import { type MotionValue, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import styles from "./TimeBlock.module.scss";

const SNAP_SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };

interface TimeBlockProps {
	block: TimeBlockType;
	autoFocus?: boolean;
	onFocused?: () => void;
	onEditEnd?: () => void;
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
	onEditEnd,
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
	const escapedRef = useRef(false);

	const motionTop = useMotionValue(block.startMinute * MINUTE_HEIGHT);
	const motionHeight = useMotionValue(block.durationMinutes * MINUTE_HEIGHT);

	const BLOCK_GAP = 2;
	const visualTop = useTransform(motionTop, (v) => v);
	const visualHeight = useTransform(motionHeight, (v) => v - BLOCK_GAP);

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
		if (escapedRef.current) {
			escapedRef.current = false;
			return;
		}
		if (localLabel.trim() === "") {
			deleteBlock(block.id);
		} else {
			updateBlock(block.id, { label: localLabel });
		}
		setIsEditing(false);
		onEditEnd?.();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			saveLabel();
			inputRef.current?.blur();
		}
		if (e.key === "Escape") {
			escapedRef.current = true;
			setLocalLabel(block.label);
			setIsEditing(false);
			onEditEnd?.();
			inputRef.current?.blur();
		}
	};

	return (
		<motion.div
			className={styles.timeBlock}
			style={{
				top: visualTop,
				height: visualHeight,
        borderColor: COLOR_PALETTE[block.colorIndex],
				backgroundColor: COLOR_PALETTE[block.colorIndex],
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
					<svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
						<line x1="2" y1="2" x2="8" y2="8" />
						<line x1="8" y1="2" x2="2" y2="8" />
					</svg>
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

import {
	DAY_END_MINUTES,
	MINUTE_HEIGHT,
	SNAP_MINUTES,
	SNAP_PX,
} from "@/constants";
import { useStore } from "@/store";
import type { TimeBlock as TimeBlockType } from "@/types";
import { clampMinutes } from "@/utils/time";
import { motion, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Resizable } from "re-resizable";
import styles from "./TimeBlock.module.scss";

function ResizeHandle() {
	return (
		<div
			className={styles.resizeHandle}
			onPointerDownCapture={(e) => e.stopPropagation()}
		/>
	);
}

interface TimeBlockProps {
	block: TimeBlockType;
	autoFocus?: boolean;
	onFocused?: () => void;
}

export function TimeBlock({ block, autoFocus, onFocused }: TimeBlockProps) {
	const updateBlock = useStore((s) => s.updateBlock);
	const deleteBlock = useStore((s) => s.deleteBlock);

	const [isEditing, setIsEditing] = useState(false);
	const [localLabel, setLocalLabel] = useState(block.label);
	const inputRef = useRef<HTMLInputElement>(null);
	const y = useMotionValue(0);

	// Reset drag offset when store updates position
	useEffect(() => {
		y.set(0);
	}, [block.startMinute, y]);

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

	const handleDragEnd = (_: unknown, info: { offset: { y: number } }) => {
		const deltaMinutes =
			Math.round(info.offset.y / SNAP_PX) * SNAP_MINUTES;
		const newStart = clampMinutes(
			block.startMinute + deltaMinutes,
			0,
			DAY_END_MINUTES - block.durationMinutes,
		);
		updateBlock(block.id, { startMinute: newStart });
	};

	const handleResizeStop = (
		_e: MouseEvent | TouchEvent,
		direction: string,
		_ref: HTMLElement,
		delta: { height: number },
	) => {
		const deltaMinutes =
			Math.round(delta.height / SNAP_PX) * SNAP_MINUTES;

		if (direction === "top") {
			const newStart = clampMinutes(
				block.startMinute - deltaMinutes,
				0,
				block.startMinute + block.durationMinutes - SNAP_MINUTES,
			);
			const newDuration =
				block.durationMinutes + (block.startMinute - newStart);
			updateBlock(block.id, {
				startMinute: newStart,
				durationMinutes: newDuration,
			});
		} else {
			const newDuration = Math.max(
				SNAP_MINUTES,
				block.durationMinutes + deltaMinutes,
			);
			updateBlock(block.id, { durationMinutes: newDuration });
		}
	};

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

	const blockHeight = block.durationMinutes * MINUTE_HEIGHT;

	return (
		<motion.div
			className={styles.timeBlock}
			style={{
				top: block.startMinute * MINUTE_HEIGHT,
				height: blockHeight,
				borderColor: block.color,
				y,
			}}
			drag={isEditing ? false : "y"}
			dragMomentum={false}
			dragElastic={0}
			dragListener={!isEditing}
			onDragEnd={handleDragEnd}
			onTap={() => {
				if (!isEditing) {
					setIsEditing(true);
					setTimeout(() => inputRef.current?.focus(), 0);
				}
			}}
		>
			<Resizable
				size={{ width: "100%", height: blockHeight }}
				minHeight={SNAP_PX}
				maxHeight={
					(DAY_END_MINUTES - block.startMinute) * MINUTE_HEIGHT
				}
				grid={[1, SNAP_PX]}
				enable={{
					top: true,
					right: false,
					bottom: true,
					left: false,
					topRight: false,
					bottomRight: false,
					bottomLeft: false,
					topLeft: false,
				}}
				onResizeStop={handleResizeStop}
				handleComponent={{
					top: <ResizeHandle />,
					bottom: <ResizeHandle />,
				}}
				handleStyles={{
					top: {
						top: -6,
						height: 12,
						left: 0,
						right: 0,
						zIndex: 10,
					},
					bottom: {
						bottom: -6,
						height: 12,
						left: 0,
						right: 0,
						zIndex: 10,
					},
				}}
				className={styles.resizable}
			>
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
			</Resizable>
		</motion.div>
	);
}

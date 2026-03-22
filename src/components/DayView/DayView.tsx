import {
	DEFAULT_VIEW_START,
	MINUTE_HEIGHT,
	TOTAL_DAY_HEIGHT,
} from "@/constants";
import { TimeBlock } from "@/components/TimeBlock";
import { TimeGrid } from "@/components/TimeGrid";
import { useStore } from "@/store";
import { pxToSnappedMinutes } from "@/utils/time";
import { useEffect, useRef, useState } from "react";
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

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: DEFAULT_VIEW_START * MINUTE_HEIGHT,
		});
	}, [date]);

	const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target !== e.currentTarget) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const scrollTop = e.currentTarget.scrollTop;
		const clickY = e.clientY - rect.top + scrollTop;
		const snappedMinute = pxToSnappedMinutes(clickY);

		const id = addBlock(date, snappedMinute);
		setNewBlockId(id);
	};

	return (
		<div className={styles.dayView} ref={scrollRef}>
			<div
				className={styles.dayViewInner}
				style={{ height: TOTAL_DAY_HEIGHT }}
				onClick={handleGridClick}
			>
				<TimeGrid />
				{blocks.map((block) => (
					<TimeBlock
						key={block.id}
						block={block}
						autoFocus={block.id === newBlockId}
						onFocused={() => setNewBlockId(null)}
					/>
				))}
			</div>
		</div>
	);
}

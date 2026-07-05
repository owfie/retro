import { addDays, differenceInCalendarDays, format } from "date-fns";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Chevron } from "@/components/Chevron";
import { formatDateToISO, parseLocalDate } from "@/utils/time";
import styles from "./DayStrip.module.scss";

const WINDOW_SIZE = 5;
const PILL_SPRING = { type: "spring", stiffness: 550, damping: 42 } as const;

interface DayStripProps {
	currentDate: string;
	onSelect: (iso: string) => void;
}

/**
 * Fixed 5-day window. Selecting a day moves the highlight pill (animated via
 * layoutId) without shifting the window; the chevrons page the whole window.
 * The window only recenters when the selected day leaves it (e.g. via swipe
 * or the mini calendar).
 */
export function DayStrip({ currentDate, onSelect }: DayStripProps) {
	const [windowStart, setWindowStart] = useState(() =>
		addDays(parseLocalDate(currentDate), -2),
	);

	// Keep an externally-changed selection visible
	useEffect(() => {
		const selected = parseLocalDate(currentDate);
		setWindowStart((start) => {
			const offset = differenceInCalendarDays(selected, start);
			return offset < 0 || offset >= WINDOW_SIZE
				? addDays(selected, -2)
				: start;
		});
	}, [currentDate]);

	return (
		<div className={styles.strip}>
			<button
				type="button"
				className={styles.chevron}
				aria-label="Previous days"
				onClick={() => setWindowStart((start) => addDays(start, -WINDOW_SIZE))}
			>
				<Chevron direction={-1} />
			</button>
			{Array.from({ length: WINDOW_SIZE }, (_, i) => {
				const day = addDays(windowStart, i);
				const iso = formatDateToISO(day);
				const isSelected = iso === currentDate;
				return (
					<button
						key={iso}
						type="button"
						className={styles.day}
						data-selected={isSelected}
						onClick={() => onSelect(iso)}
					>
						{isSelected && (
							<motion.span
								layoutId="dayStripPill"
								className={styles.pill}
								transition={PILL_SPRING}
							/>
						)}
						<span className={styles.dayText}>{format(day, "EEE d")}</span>
					</button>
				);
			})}
			<button
				type="button"
				className={styles.chevron}
				aria-label="Next days"
				onClick={() => setWindowStart((start) => addDays(start, WINDOW_SIZE))}
			>
				<Chevron direction={1} />
			</button>
		</div>
	);
}

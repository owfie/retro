import {
	addMonths,
	differenceInCalendarMonths,
	format,
	getDay,
	getDaysInMonth,
	isSameMonth,
	startOfMonth,
} from "date-fns";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Chevron } from "@/components/Chevron";
import { useStore } from "@/store";
import { formatDateToISO, parseLocalDate } from "@/utils/time";
import styles from "./MiniCalendar.module.scss";

const MONTH_WINDOW = 3;
const PILL_SPRING = { type: "spring", stiffness: 550, damping: 42 } as const;

export function MiniCalendar() {
	const currentDate = useStore((s) => s.currentDate);
	const setCurrentDate = useStore((s) => s.setCurrentDate);
	const blocks = useStore((s) => s.blocks);

	const datesWithEntries = useMemo(
		() => new Set(blocks.map((b) => b.date)),
		[blocks],
	);

	// The month shown in the grid; the window of month labels is independent
	// and only pages via the chevrons or when the viewed month leaves it.
	const [viewMonth, setViewMonth] = useState(() =>
		startOfMonth(parseLocalDate(currentDate)),
	);
	const [windowStart, setWindowStart] = useState(() =>
		addMonths(startOfMonth(parseLocalDate(currentDate)), -1),
	);

	// Follow the selected date's month (e.g. when navigating via the day strip)
	useEffect(() => {
		const month = startOfMonth(parseLocalDate(currentDate));
		setViewMonth(month);
		setWindowStart((start) => {
			const offset = differenceInCalendarMonths(month, start);
			return offset < 0 || offset >= MONTH_WINDOW
				? addMonths(month, -1)
				: start;
		});
	}, [currentDate]);

	const daysInMonth = getDaysInMonth(viewMonth);
	// Monday-first grid
	const leadingBlanks = (getDay(viewMonth) + 6) % 7;

	return (
		<div className={styles.calendar}>
			<div className={styles.monthPicker}>
				<button
					type="button"
					className={styles.chevron}
					aria-label="Previous months"
					onClick={() =>
						setWindowStart((start) => addMonths(start, -MONTH_WINDOW))
					}
				>
					<Chevron direction={-1} />
				</button>
				{Array.from({ length: MONTH_WINDOW }, (_, i) => {
					const month = addMonths(windowStart, i);
					const isSelected = isSameMonth(month, viewMonth);
					return (
						<button
							key={format(month, "yyyy-MM")}
							type="button"
							className={styles.month}
							data-selected={isSelected}
							onClick={() => setViewMonth(startOfMonth(month))}
						>
							{isSelected && (
								<motion.span
									layoutId="monthPill"
									className={styles.pill}
									transition={PILL_SPRING}
								/>
							)}
							<span className={styles.monthText}>{format(month, "MMM")}</span>
						</button>
					);
				})}
				<button
					type="button"
					className={styles.chevron}
					aria-label="Next months"
					onClick={() =>
						setWindowStart((start) => addMonths(start, MONTH_WINDOW))
					}
				>
					<Chevron direction={1} />
				</button>
			</div>
			<div className={styles.grid}>
				{Array.from({ length: leadingBlanks }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static filler cells
					<span key={`blank-${i}`} />
				))}
				{Array.from({ length: daysInMonth }, (_, i) => {
					const day = i + 1;
					const iso = formatDateToISO(
						new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day),
					);
					return (
						<button
							key={iso}
							type="button"
							className={styles.dayCell}
							data-selected={iso === currentDate}
							data-has-entries={datesWithEntries.has(iso)}
							onClick={() => setCurrentDate(iso)}
						>
							{day}
						</button>
					);
				})}
			</div>
		</div>
	);
}

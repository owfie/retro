import {
	addMonths,
	format,
	getDay,
	getDaysInMonth,
	startOfMonth,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Chevron } from "@/components/Chevron";
import { useStore } from "@/store";
import { formatDateToISO, parseLocalDate } from "@/utils/time";
import styles from "./MiniCalendar.module.scss";

const MONTH_OFFSETS = [-1, 0, 1];

export function MiniCalendar() {
	const currentDate = useStore((s) => s.currentDate);
	const setCurrentDate = useStore((s) => s.setCurrentDate);
	const blocks = useStore((s) => s.blocks);

	const datesWithEntries = useMemo(
		() => new Set(blocks.map((b) => b.date)),
		[blocks],
	);

	const [viewMonth, setViewMonth] = useState(() =>
		startOfMonth(parseLocalDate(currentDate)),
	);

	// Follow the selected date's month (e.g. when navigating via the day strip)
	useEffect(() => {
		setViewMonth(startOfMonth(parseLocalDate(currentDate)));
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
					aria-label="Previous month"
					onClick={() => setViewMonth((m) => addMonths(m, -1))}
				>
					<Chevron direction={-1} />
				</button>
				{MONTH_OFFSETS.map((offset) => {
					const month = addMonths(viewMonth, offset);
					return (
						<button
							key={format(month, "yyyy-MM")}
							type="button"
							className={styles.month}
							data-selected={offset === 0}
							onClick={() => setViewMonth(startOfMonth(month))}
						>
							{format(month, "MMM")}
						</button>
					);
				})}
				<button
					type="button"
					className={styles.chevron}
					aria-label="Next month"
					onClick={() => setViewMonth((m) => addMonths(m, 1))}
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

import { addDays, format } from "date-fns";
import { Chevron } from "@/components/Chevron";
import { formatDateToISO, parseLocalDate } from "@/utils/time";
import styles from "./DayStrip.module.scss";

const WINDOW_OFFSETS = [-2, -1, 0, 1, 2];

interface DayStripProps {
	currentDate: string;
	onSelect: (iso: string) => void;
}

/** Sliding 5-day window centered on the selected day. */
export function DayStrip({ currentDate, onSelect }: DayStripProps) {
	const center = parseLocalDate(currentDate);
	const step = (delta: number) =>
		onSelect(formatDateToISO(addDays(center, delta)));

	return (
		<div className={styles.strip}>
			<button
				type="button"
				className={styles.chevron}
				aria-label="Previous day"
				onClick={() => step(-1)}
			>
				<Chevron direction={-1} />
			</button>
			{WINDOW_OFFSETS.map((offset) => {
				const day = addDays(center, offset);
				const iso = formatDateToISO(day);
				return (
					<button
						key={iso}
						type="button"
						className={styles.day}
						data-selected={offset === 0}
						onClick={() => onSelect(iso)}
					>
						{format(day, "EEE d")}
					</button>
				);
			})}
			<button
				type="button"
				className={styles.chevron}
				aria-label="Next day"
				onClick={() => step(1)}
			>
				<Chevron direction={1} />
			</button>
		</div>
	);
}

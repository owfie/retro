import { format, setHours, startOfDay } from "date-fns";
import { HOUR_HEIGHT, TOTAL_DAY_HEIGHT } from "@/constants";
import { useStore } from "@/store";
import styles from "./TimeGrid.module.scss";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const baseDate = startOfDay(new Date());

export function TimeGrid() {
	const showGridlines = useStore((s) => s.showGridlines);
	return (
		<div
			className={styles.timeGrid}
			style={{ height: TOTAL_DAY_HEIGHT }}
			data-grid="true"
			data-gridlines={showGridlines}
		>
			{HOURS.map((hour) => (
				<div
					key={hour}
					className={styles.hourRow}
					style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
					data-grid="true"
				>
					<span className={styles.hourLabel} data-grid="true">
						{format(setHours(baseDate, hour), "h a")}
					</span>
				</div>
			))}
		</div>
	);
}

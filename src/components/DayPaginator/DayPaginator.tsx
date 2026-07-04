import { DayView } from "@/components/DayView";
import { useStore } from "@/store";
import { formatDateToISO, parseLocalDate } from "@/utils/time";
import { addDays, format } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import styles from "./DayPaginator.module.scss";

const variants = {
	enter: (dir: number) => ({
		x: dir > 0 ? "100%" : "-100%",
		opacity: 0,
	}),
	center: { x: 0, opacity: 1 },
	exit: (dir: number) => ({
		x: dir > 0 ? "-100%" : "100%",
		opacity: 0,
	}),
};

export function DayPaginator() {
	const currentDate = useStore((s) => s.currentDate);
	const setCurrentDate = useStore((s) => s.setCurrentDate);
	const isDraggingBlock = useStore((s) => s.isDraggingBlock);
	const dirRef = useRef(0);

	const navigate = (delta: number) => {
		dirRef.current = delta;
		const newDate = addDays(parseLocalDate(currentDate), delta);
		setCurrentDate(formatDateToISO(newDate));
	};

	const dateLabel = format(parseLocalDate(currentDate), "EEEE, MMM d");

	return (
		<div className={styles.paginator}>
			<div className={styles.header}>
				<button
					type="button"
					className={styles.navButton}
					onClick={() => navigate(-1)}
				>
					&#8249;
				</button>
				<span className={styles.dateLabel}>{dateLabel}</span>
				<button
					type="button"
					className={styles.navButton}
					onClick={() => navigate(1)}
				>
					&#8250;
				</button>
			</div>
			<div className={styles.viewContainer}>
				<AnimatePresence mode="popLayout" custom={dirRef.current}>
					<motion.div
						key={currentDate}
						custom={dirRef.current}
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{
							type: "spring",
							stiffness: 300,
							damping: 30,
						}}
						className={styles.dayWrapper}
						drag={isDraggingBlock ? false : "x"}
						dragDirectionLock
						dragConstraints={{ left: 0, right: 0 }}
						dragElastic={0.2}
						onDragEnd={(_, info) => {
							if (info.offset.x > 80) navigate(-1);
							else if (info.offset.x < -80) navigate(1);
						}}
					>
						<DayView date={currentDate} />
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
}

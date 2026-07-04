import { addDays, format } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { DayView } from "@/components/DayView";
import { useStore } from "@/store";
import { formatDateToISO, parseLocalDate } from "@/utils/time";
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

	const today = formatDateToISO(new Date());
	const isToday = currentDate === today;

	const goToToday = () => {
		if (isToday) return;
		dirRef.current = currentDate < today ? 1 : -1;
		setCurrentDate(today);
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
				<div className={styles.titleGroup}>
					<span className={styles.dateLabel}>{dateLabel}</span>
					<AnimatePresence>
						{!isToday && (
							<motion.button
								type="button"
								className={styles.todayButton}
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.9 }}
								transition={{ duration: 0.15 }}
								onClick={goToToday}
							>
								Today
							</motion.button>
						)}
					</AnimatePresence>
				</div>
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

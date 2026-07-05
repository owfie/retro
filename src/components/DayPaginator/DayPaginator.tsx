import { addDays } from "date-fns";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useRef } from "react";
import { DayStrip } from "@/components/DayStrip";
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
	const dirRef = useRef(0);
	// Manual drag: the swipe is only ever started from the empty grid (see
	// DayView.onSwipeStart), so block/resize/grab pointerdowns can never page
	// the view. Motion auto-listening would start the pan as the pointerdown
	// bubbled up from a block, which no amount of stopPropagation reliably
	// prevents (it attaches native listeners on the wrapper).
	const dragControls = useDragControls();

	const navigate = (delta: number) => {
		dirRef.current = delta;
		const newDate = addDays(parseLocalDate(currentDate), delta);
		setCurrentDate(formatDateToISO(newDate));
	};

	const goToDate = (iso: string) => {
		if (iso === currentDate) return;
		dirRef.current = iso > currentDate ? 1 : -1;
		setCurrentDate(iso);
	};

	const today = formatDateToISO(new Date());
	const isToday = currentDate === today;

	return (
		<div className={styles.paginator}>
			<div className={styles.header}>
				<DayStrip currentDate={currentDate} onSelect={goToDate} />
				<AnimatePresence>
					{!isToday && (
						<motion.button
							type="button"
							className={styles.todayButton}
							initial={{ opacity: 0, scale: 0.9, y: "-50%" }}
							animate={{ opacity: 1, scale: 1, y: "-50%" }}
							exit={{ opacity: 0, scale: 0.9, y: "-50%" }}
							transition={{ duration: 0.15 }}
							onClick={() => goToDate(today)}
						>
							Today
						</motion.button>
					)}
				</AnimatePresence>
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
						drag="x"
						dragListener={false}
						dragControls={dragControls}
						dragDirectionLock
						dragConstraints={{ left: 0, right: 0 }}
						dragElastic={0.2}
						onDragEnd={(_, info) => {
							if (info.offset.x > 80) navigate(-1);
							else if (info.offset.x < -80) navigate(1);
						}}
					>
						<DayView
							date={currentDate}
							onSwipeStart={(e) => dragControls.start(e)}
						/>
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
}

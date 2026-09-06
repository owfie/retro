import { addDays } from "date-fns";
import { AnimatePresence, motion, useDragControls } from "motion/react";
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
	// Manual drag: the swipe is only ever started from the empty grid (see
	// DayView.onSwipeStart), so block/resize/grab pointerdowns can never page
	// the view. Motion auto-listening would start the pan as the pointerdown
	// bubbled up from a block, which no amount of stopPropagation reliably
	// prevents (it attaches native listeners on the wrapper).
	const dragControls = useDragControls();

	// Page direction is derived from the date itself, so every navigator —
	// the dock's strip and calendar, the Today pill, a swipe — animates the
	// right way without having to report which way it moved.
	const prevDateRef = useRef(currentDate);
	const dirRef = useRef(0);
	if (prevDateRef.current !== currentDate) {
		dirRef.current = currentDate > prevDateRef.current ? 1 : -1;
		prevDateRef.current = currentDate;
	}

	const navigate = (delta: number) => {
		const newDate = addDays(parseLocalDate(currentDate), delta);
		setCurrentDate(formatDateToISO(newDate));
	};

	return (
		<div className={styles.paginator}>
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

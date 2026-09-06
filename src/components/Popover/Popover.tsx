import { AnimatePresence, motion } from "motion/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { CHROME_LAYOUT_SPRING } from "@/constants";
import styles from "./Popover.module.scss";

const PANEL_SPRING = { type: "spring", stiffness: 520, damping: 38 } as const;

interface PopoverProps {
	/** Contents of the trigger button. */
	trigger: ReactNode;
	/** Accessible name for the trigger. */
	label: string;
	/** Which edge the panel's edge lines up with. */
	align?: "left" | "right";
	triggerClassName?: string;
	panelClassName?: string;
	/** A function child receives `close` so selections can dismiss the panel. */
	children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * Dock popover: opens upward from its trigger. Dismisses on outside pointer,
 * on Escape, and returns focus to the trigger so keyboard users don't get
 * dropped at the top of the document.
 */
export function Popover({
	trigger,
	label,
	align = "left",
	triggerClassName,
	panelClassName,
	children,
}: PopoverProps) {
	const [open, setOpen] = useState(false);
	const anchorRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelId = useId();

	const close = useCallback(() => setOpen(false), []);

	useEffect(() => {
		if (!open) return;

		// Captured at the document so the dismissing press never reaches the
		// day grid underneath — panels open upward over it, and there a
		// pointerdown on empty space starts creating a block.
		const onPointerDown = (e: PointerEvent) => {
			if (anchorRef.current?.contains(e.target as Node)) return;
			e.stopPropagation();
			setOpen(false);
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			e.stopPropagation();
			setOpen(false);
			triggerRef.current?.focus();
		};

		document.addEventListener("pointerdown", onPointerDown, true);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<motion.div
			layout="position"
			transition={CHROME_LAYOUT_SPRING}
			className={styles.anchor}
			ref={anchorRef}
		>
			<button
				type="button"
				ref={triggerRef}
				className={`${styles.trigger} ${triggerClassName ?? ""}`}
				aria-label={label}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls={open ? panelId : undefined}
				onClick={() => setOpen((v) => !v)}
			>
				{trigger}
			</button>
			<AnimatePresence>
				{open && (
					<motion.div
						id={panelId}
						role="dialog"
						aria-label={label}
						className={`${styles.panel} ${panelClassName ?? ""}`}
						data-align={align}
						initial={{ opacity: 0, y: 8, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 8, scale: 0.96 }}
						transition={PANEL_SPRING}
					>
						{typeof children === "function" ? children(close) : children}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

import { useEffect } from "react";
import { DayPaginator, MiniCalendar, SettingsPanel } from "@/components";
import { useStore } from "@/store";
import styles from "./App.module.scss";

export function App() {
	// Cmd/Ctrl+Z undoes block mutations (inputs keep their native undo)
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const isUndo =
				(e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z";
			if (!isUndo) return;
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			)
				return;
			e.preventDefault();
			useStore.getState().undo();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	return (
		<div className={styles.app}>
			<aside className={styles.sidebar}>
				<MiniCalendar />
				<SettingsPanel />
			</aside>
			<main className={styles.main}>
				<div className={styles.dayPane}>
					<DayPaginator />
				</div>
			</main>
		</div>
	);
}

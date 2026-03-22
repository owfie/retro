import { DayPaginator } from "@/components";
import styles from "./App.module.scss";

export function App() {
	return (
		<div className={styles.app}>
			<DayPaginator />
		</div>
	);
}

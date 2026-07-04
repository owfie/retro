import { useEffect, useState } from "react";
import { MINUTE_HEIGHT } from "@/constants";
import styles from "./NowLine.module.scss";

function currentMinutes(): number {
	const now = new Date();
	return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

export function NowLine() {
	const [minutes, setMinutes] = useState(currentMinutes);

	useEffect(() => {
		const id = setInterval(() => setMinutes(currentMinutes()), 30_000);
		return () => clearInterval(id);
	}, []);

	return (
		<div
			className={styles.nowLine}
			style={{ top: minutes * MINUTE_HEIGHT }}
			aria-hidden
		>
			<div className={styles.dot} />
		</div>
	);
}

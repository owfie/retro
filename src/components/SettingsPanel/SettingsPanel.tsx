import { THEMES, type ThemeId } from "@/constants";
import { useStore } from "@/store";
import styles from "./SettingsPanel.module.scss";

const THEME_IDS = Object.keys(THEMES) as ThemeId[];
const PREVIEW_DOTS = 4;

export function SettingsPanel() {
	const theme = useStore((s) => s.theme);
	const setTheme = useStore((s) => s.setTheme);
	const showGridlines = useStore((s) => s.showGridlines);
	const setShowGridlines = useStore((s) => s.setShowGridlines);

	return (
		<div className={styles.panel}>
			{THEME_IDS.map((id) => (
				<button
					key={id}
					type="button"
					className={styles.themeRow}
					data-active={id === theme}
					onClick={() => setTheme(id)}
				>
					<span className={styles.rowLabel}>{THEMES[id].name}</span>
					<span className={styles.dots}>
						{THEMES[id].swatches.slice(0, PREVIEW_DOTS).map((swatch) => (
							<span
								key={swatch.bg}
								className={styles.dot}
								style={{ backgroundColor: swatch.bg }}
							/>
						))}
					</span>
				</button>
			))}
			<div className={styles.settingRow}>
				<span className={styles.rowLabel}>Gridlines</span>
				<button
					type="button"
					role="switch"
					aria-checked={showGridlines}
					aria-label="Toggle gridlines"
					className={styles.toggle}
					data-on={showGridlines}
					onClick={() => setShowGridlines(!showGridlines)}
				>
					<span className={styles.knob} />
				</button>
			</div>
		</div>
	);
}

import { format } from "date-fns";
import { LayoutGroup } from "motion/react";
import { DayStrip } from "@/components/DayStrip";
import { MiniCalendar } from "@/components/MiniCalendar";
import { Popover } from "@/components/Popover";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useSelectionSwatch, useThemePalette } from "@/hooks";
import { useStore } from "@/store";
import { parseLocalDate } from "@/utils/time";
import styles from "./Dock.module.scss";

/** Palette entries shown in the appearance trigger's stack. */
const STACK_INDICES = [0, 2, 4];

/**
 * Bottom chrome: month chip, day strip, and appearance — each on its own
 * segment. The calendar and theme list sit in popovers rather than taking
 * permanent space, since both are reached far less often than the strip.
 */
export function Dock() {
	const currentDate = useStore((s) => s.currentDate);
	const setCurrentDate = useStore((s) => s.setCurrentDate);
	const palette = useThemePalette();
	const selection = useSelectionSwatch();

	return (
		<div
			className={styles.dock}
			style={
				{
					"--selection-bg": selection.bg,
					"--selection-text": selection.text,
				} as React.CSSProperties
			}
		>
			<LayoutGroup>
				<Popover
					label="Choose a date"
					align="left"
					triggerClassName={styles.monthChip}
					panelClassName={styles.calendarPanel}
					trigger={
						<span className={styles.monthLabel}>
							{format(parseLocalDate(currentDate), "MMM yyyy")}
						</span>
					}
				>
					{(close) => (
						<MiniCalendar
							onSelect={(iso) => {
								setCurrentDate(iso);
								close();
							}}
						/>
					)}
				</Popover>

				<DayStrip
					currentDate={currentDate}
					onSelect={setCurrentDate}
					className={styles.stripSegment}
				/>

				<Popover
					label="Appearance"
					align="right"
					triggerClassName={styles.appearanceChip}
					panelClassName={styles.settingsPanel}
					trigger={
						<span className={styles.swatchStack}>
							{STACK_INDICES.map((i) => (
								<span
									key={i}
									className={styles.swatchDot}
									style={{ backgroundColor: palette[i].bg }}
								/>
							))}
						</span>
					}
				>
					<SettingsPanel />
				</Popover>
			</LayoutGroup>
		</div>
	);
}

import { THEMES, type ThemeSwatch } from "@/constants";
import { useStore } from "@/store";

/** Swatches of the active theme. Blocks map their colorIndex into this. */
export function useThemePalette(): readonly ThemeSwatch[] {
	const theme = useStore((s) => s.theme);
	return THEMES[theme].swatches;
}

import { SELECTION_SWATCH_INDEX, THEMES, type ThemeSwatch } from "@/constants";
import { useStore } from "@/store";

/** Swatches of the active theme. Blocks map their colorIndex into this. */
export function useThemePalette(): readonly ThemeSwatch[] {
	const theme = useStore((s) => s.theme);
	return THEMES[theme].swatches;
}

/**
 * Swatch the chrome tints its selected pills with. Exposed as the
 * `--selection-bg` / `--selection-text` custom properties; the text colour is
 * the same luminance-derived one blocks use, so every theme stays legible.
 */
export function useSelectionSwatch(): ThemeSwatch {
	const theme = useStore((s) => s.theme);
	return THEMES[theme].swatches[SELECTION_SWATCH_INDEX];
}

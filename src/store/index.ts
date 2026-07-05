import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	DEFAULT_BLOCK_DURATION,
	LEGACY_V0_PALETTE,
	PALETTE_SIZE,
	THEMES,
	type ThemeId,
} from "@/constants";
import type { TimeBlock } from "@/types";
import { formatDateToISO } from "@/utils/time";

const HISTORY_LIMIT = 50;

/** Ephemeral preview while resizing a block; not persisted. */
export interface BlockLivePreview {
	startMinute: number;
	durationMinutes: number;
}

/** Ephemeral preview while drag-creating a block; not persisted. */
export interface DraftBlockPreview {
	date: string;
	startMinute: number;
	durationMinutes: number;
	colorIndex: number;
}

interface RetroState {
	blocks: TimeBlock[];
	currentDate: string;
	nextColorIndex: number;
	isDraggingBlock: boolean;
	blockLivePreviews: Record<string, BlockLivePreview>;
	draftBlockPreview: DraftBlockPreview | null;
	history: TimeBlock[][];
	theme: ThemeId;
	showGridlines: boolean;

	setTheme: (theme: ThemeId) => void;
	setShowGridlines: (show: boolean) => void;
	setDraggingBlock: (dragging: boolean) => void;
	setBlockLivePreview: (
		id: string,
		preview: BlockLivePreview | null,
	) => void;
	setDraftBlockPreview: (preview: DraftBlockPreview | null) => void;
	addBlock: (
		date: string,
		startMinute: number,
		durationMinutes?: number,
	) => string;
	updateBlock: (id: string, updates: Partial<Omit<TimeBlock, "id">>) => void;
	updateBlocks: (
		updates: Array<{ id: string; changes: Partial<Omit<TimeBlock, "id">> }>,
	) => void;
	deleteBlock: (id: string) => void;
	undo: () => void;
	setCurrentDate: (date: string) => void;
	getBlocksForDate: (date: string) => TimeBlock[];
}

/** Snapshot the current blocks onto the bounded undo stack. */
function pushHistory(state: RetroState): TimeBlock[][] {
	return [...state.history.slice(-(HISTORY_LIMIT - 1)), state.blocks];
}

export const useStore = create<RetroState>()(
	persist(
		(set, get) => ({
			blocks: [],
			currentDate: formatDateToISO(new Date()),
			nextColorIndex: 0,
			isDraggingBlock: false,
			blockLivePreviews: {},
			draftBlockPreview: null,
			history: [],
			theme: "bubblegum",
			showGridlines: true,

			setTheme: (theme) => set({ theme }),

			setShowGridlines: (show) => set({ showGridlines: show }),

			setDraggingBlock: (dragging) => set({ isDraggingBlock: dragging }),

			setBlockLivePreview: (id, preview) =>
				set((state) => {
					if (preview === null) {
						if (!(id in state.blockLivePreviews)) return state;
						const { [id]: _, ...blockLivePreviews } = state.blockLivePreviews;
						return { blockLivePreviews };
					}
					return {
						blockLivePreviews: {
							...state.blockLivePreviews,
							[id]: preview,
						},
					};
				}),

			setDraftBlockPreview: (preview) => set({ draftBlockPreview: preview }),

			addBlock: (
				date,
				startMinute,
				durationMinutes = DEFAULT_BLOCK_DURATION,
			) => {
				const colorIndex = get().nextColorIndex;
				const block: TimeBlock = {
					id: crypto.randomUUID(),
					date,
					startMinute,
					durationMinutes,
					label: "",
					colorIndex,
				};
				set((state) => ({
					history: pushHistory(state),
					blocks: [...state.blocks, block],
					nextColorIndex: (state.nextColorIndex + 1) % PALETTE_SIZE,
				}));
				return block.id;
			},

			updateBlock: (id, updates) =>
				set((state) => {
					const target = state.blocks.find((b) => b.id === id);
					if (!target) return state;
					const changed = Object.entries(updates).some(
						([key, value]) => target[key as keyof TimeBlock] !== value,
					);
					if (!changed) return state;
					return {
						history: pushHistory(state),
						blocks: state.blocks.map((b) =>
							b.id === id ? { ...b, ...updates } : b,
						),
					};
				}),

			updateBlocks: (updates) =>
				set((state) => ({
					history: pushHistory(state),
					blocks: state.blocks.map((b) => {
						const update = updates.find((u) => u.id === b.id);
						return update ? { ...b, ...update.changes } : b;
					}),
				})),

			deleteBlock: (id) =>
				set((state) => ({
					history: pushHistory(state),
					blocks: state.blocks.filter((b) => b.id !== id),
				})),

			undo: () =>
				set((state) => {
					const prev = state.history[state.history.length - 1];
					if (!prev) return state;
					return {
						blocks: prev,
						history: state.history.slice(0, -1),
					};
				}),

			setCurrentDate: (date) => set({ currentDate: date }),

			getBlocksForDate: (date) => get().blocks.filter((b) => b.date === date),
		}),
		{
			name: "retro-storage",
			version: 3,
			partialize: (state) => ({
				blocks: state.blocks,
				nextColorIndex: state.nextColorIndex,
				theme: state.theme,
				showGridlines: state.showGridlines,
			}),
			migrate: (persisted: unknown, version: number) => {
				let state = persisted as Record<string, unknown>;

				if (version === 0) {
					const legacy = state as {
						blocks?: Array<Record<string, unknown>>;
						nextColorIndex?: number;
					};
					const blocks = (legacy.blocks ?? []).map((b) => {
						if ("color" in b && !("colorIndex" in b)) {
							const { color, ...rest } = b;
							const idx = LEGACY_V0_PALETTE.indexOf(
								color as (typeof LEGACY_V0_PALETTE)[number],
							);
							return { ...rest, colorIndex: idx >= 0 ? idx % PALETTE_SIZE : 0 };
						}
						return b;
					});
					state = { ...legacy, blocks };
				}

				if (version <= 2) {
					const theme = state.theme as string | undefined;
					if (theme === "nightLight") state.theme = "bubblegum";
					else if (theme === "autumn") state.theme = "twilight";
					else if (!theme || !(theme in THEMES)) state.theme = "bubblegum";

					const blocks = (state.blocks as TimeBlock[] | undefined) ?? [];
					state.blocks = blocks.map((b) => ({
						...b,
						colorIndex: b.colorIndex % PALETTE_SIZE,
					}));
					state.nextColorIndex =
						((state.nextColorIndex as number | undefined) ?? 0) % PALETTE_SIZE;
				}

				return state;
			},
		},
	),
);

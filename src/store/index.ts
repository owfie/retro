import { COLOR_PALETTE, DEFAULT_BLOCK_DURATION } from "@/constants";
import type { TimeBlock } from "@/types";
import { formatDateToISO } from "@/utils/time";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RetroState {
	blocks: TimeBlock[];
	currentDate: string;
	nextColorIndex: number;
	isDraggingBlock: boolean;

	setDraggingBlock: (dragging: boolean) => void;
	addBlock: (date: string, startMinute: number) => string;
	updateBlock: (id: string, updates: Partial<Omit<TimeBlock, "id">>) => void;
	updateBlocks: (updates: Array<{ id: string; changes: Partial<Omit<TimeBlock, "id">> }>) => void;
	deleteBlock: (id: string) => void;
	setCurrentDate: (date: string) => void;
	getBlocksForDate: (date: string) => TimeBlock[];
}

export const useStore = create<RetroState>()(
	persist(
		(set, get) => ({
			blocks: [],
			currentDate: formatDateToISO(new Date()),
			nextColorIndex: 0,
			isDraggingBlock: false,

			setDraggingBlock: (dragging) => set({ isDraggingBlock: dragging }),

			addBlock: (date, startMinute) => {
				const colorIndex = get().nextColorIndex;
				const block: TimeBlock = {
					id: crypto.randomUUID(),
					date,
					startMinute,
					durationMinutes: DEFAULT_BLOCK_DURATION,
					label: "",
					colorIndex,
				};
				set((state) => ({
					blocks: [...state.blocks, block],
					nextColorIndex:
						(state.nextColorIndex + 1) % COLOR_PALETTE.length,
				}));
				return block.id;
			},

			updateBlock: (id, updates) =>
				set((state) => ({
					blocks: state.blocks.map((b) =>
						b.id === id ? { ...b, ...updates } : b,
					),
				})),

			updateBlocks: (updates) =>
				set((state) => ({
					blocks: state.blocks.map((b) => {
						const update = updates.find((u) => u.id === b.id);
						return update ? { ...b, ...update.changes } : b;
					}),
				})),

			deleteBlock: (id) =>
				set((state) => ({
					blocks: state.blocks.filter((b) => b.id !== id),
				})),

			setCurrentDate: (date) => set({ currentDate: date }),

			getBlocksForDate: (date) =>
				get().blocks.filter((b) => b.date === date),
		}),
		{
			name: "retro-storage",
			version: 1,
			partialize: (state) => ({
				blocks: state.blocks,
				nextColorIndex: state.nextColorIndex,
			}),
			migrate: (persisted: unknown, version: number) => {
				if (version === 0) {
					const state = persisted as { blocks?: Array<Record<string, unknown>>; nextColorIndex?: number };
					const blocks = (state.blocks ?? []).map((b) => {
						if ("color" in b && !("colorIndex" in b)) {
							const { color, ...rest } = b;
							const idx = COLOR_PALETTE.indexOf(color as typeof COLOR_PALETTE[number]);
							return { ...rest, colorIndex: idx >= 0 ? idx : 0 };
						}
						return b;
					});
					return { ...state, blocks };
				}
				return persisted;
			},
		},
	),
);

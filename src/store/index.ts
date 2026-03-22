import { COLOR_PALETTE, DEFAULT_BLOCK_DURATION } from "@/constants";
import type { TimeBlock } from "@/types";
import { formatDateToISO } from "@/utils/time";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RetroState {
	blocks: TimeBlock[];
	currentDate: string;
	nextColorIndex: number;

	addBlock: (date: string, startMinute: number) => string;
	updateBlock: (id: string, updates: Partial<Omit<TimeBlock, "id">>) => void;
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

			addBlock: (date, startMinute) => {
				const color = COLOR_PALETTE[get().nextColorIndex];
				const block: TimeBlock = {
					id: crypto.randomUUID(),
					date,
					startMinute,
					durationMinutes: DEFAULT_BLOCK_DURATION,
					label: "",
					color,
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
			partialize: (state) => ({
				blocks: state.blocks,
				nextColorIndex: state.nextColorIndex,
			}),
		},
	),
);

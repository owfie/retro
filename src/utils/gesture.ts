import { MINUTE_HEIGHT } from "@/constants";

const MOVE_THRESHOLD_PX = 4;
const EDGE_SCROLL_ZONE = 48; // px from viewport edge where auto-scroll kicks in
const EDGE_SCROLL_MAX_SPEED = 14; // px per frame at the very edge

export interface VerticalGestureState {
	/** Pointer travel in minutes, compensated for container scrolling. */
	deltaMinutes: number;
	clientY: number;
	/** True once the pointer has moved beyond the tap threshold. */
	began: boolean;
}

export interface VerticalGestureEndState extends VerticalGestureState {
	/** True when the gesture ended with pointercancel rather than pointerup. */
	cancelled: boolean;
}

export interface VerticalGestureHandlers {
	/**
	 * Decides whether the gesture starts once movement exceeds the tap
	 * threshold. Returning false aborts: listeners are removed and only
	 * onAbort fires. Defaults to always beginning.
	 */
	shouldBegin?: (dx: number, dy: number) => boolean;
	/** Fired once when the gesture begins. */
	onBegin?: () => void;
	/** Fired on every pointer move and auto-scroll frame. */
	onUpdate?: (state: VerticalGestureState) => void;
	/** Fired on pointerup/pointercancel (not after an abort). */
	onEnd: (state: VerticalGestureEndState) => void;
	/** Fired when shouldBegin aborts the gesture. */
	onAbort?: () => void;
	/** Auto-scroll the [data-scroll-container] near its edges. Default true. */
	autoScroll?: boolean;
}

/** Scrolls the container when the pointer nears its top/bottom edge. */
function createAutoScroller(scrollEl: HTMLElement | null, onStep: () => void) {
	let speed = 0;
	let raf = 0;

	const step = () => {
		if (!scrollEl || speed === 0) {
			raf = 0;
			return;
		}
		scrollEl.scrollTop += speed;
		onStep();
		raf = requestAnimationFrame(step);
	};

	return {
		update(clientY: number) {
			if (!scrollEl) return;
			const rect = scrollEl.getBoundingClientRect();
			const fromTop = clientY - rect.top;
			const fromBottom = rect.bottom - clientY;
			if (fromTop < EDGE_SCROLL_ZONE) {
				speed =
					-EDGE_SCROLL_MAX_SPEED *
					(1 - Math.max(0, fromTop) / EDGE_SCROLL_ZONE);
			} else if (fromBottom < EDGE_SCROLL_ZONE) {
				speed =
					EDGE_SCROLL_MAX_SPEED *
					(1 - Math.max(0, fromBottom) / EDGE_SCROLL_ZONE);
			} else {
				speed = 0;
			}
			if (speed !== 0 && raf === 0) raf = requestAnimationFrame(step);
		},
		stop() {
			speed = 0;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		},
	};
}

/**
 * Shared plumbing for vertical drag gestures: pointer capture, tap threshold,
 * scroll-compensated deltas, edge auto-scroll, and listener cleanup.
 * Callers receive minute-space deltas and map them to their own targets.
 */
export function startVerticalGesture(
	e: React.PointerEvent,
	{
		shouldBegin,
		onBegin,
		onUpdate,
		onEnd,
		onAbort,
		autoScroll = true,
	}: VerticalGestureHandlers,
) {
	const el = e.currentTarget as HTMLElement;
	el.setPointerCapture(e.pointerId);

	const scrollEl = el.closest<HTMLElement>("[data-scroll-container]");
	const startScrollTop = scrollEl?.scrollTop ?? 0;
	const startX = e.clientX;
	const startY = e.clientY;
	let lastClientY = startY;
	let began = false;

	const readState = (): VerticalGestureState => {
		const scrollDelta = (scrollEl?.scrollTop ?? 0) - startScrollTop;
		return {
			deltaMinutes: (lastClientY - startY + scrollDelta) / MINUTE_HEIGHT,
			clientY: lastClientY,
			began,
		};
	};

	const scroller = createAutoScroller(scrollEl, () => onUpdate?.(readState()));

	const cleanup = () => {
		el.removeEventListener("pointermove", onMove);
		el.removeEventListener("pointerup", onUp);
		el.removeEventListener("pointercancel", onCancel);
		scroller.stop();
	};

	const onMove = (ev: PointerEvent) => {
		lastClientY = ev.clientY;
		if (!began) {
			const dx = Math.abs(ev.clientX - startX);
			const dy = Math.abs(ev.clientY - startY);
			if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
				if (shouldBegin && !shouldBegin(dx, dy)) {
					cleanup();
					onAbort?.();
					return;
				}
				began = true;
				onBegin?.();
			}
		}
		if (began && autoScroll) scroller.update(ev.clientY);
		onUpdate?.(readState());
	};

	const finish = (cancelled: boolean) => {
		cleanup();
		onEnd({ ...readState(), cancelled });
	};

	const onUp = () => finish(false);
	const onCancel = () => finish(true);

	el.addEventListener("pointermove", onMove);
	el.addEventListener("pointerup", onUp);
	el.addEventListener("pointercancel", onCancel);
}

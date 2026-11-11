"use client";

import { type PointerEvent, type RefObject, useRef, useState } from "react";

// Pointer-event drag on a row's handle (mouse, pen and touch). The row moves
// live as the pointer crosses its neighbours, so the others shift and the gap
// follows the pointer. Keyboard users use the row menu or the handle's arrow
// keys (RNF-16 to RNF-18).
export function useFieldReorder({
	listRef,
	move,
}: Readonly<{
	listRef: RefObject<HTMLElement | null>;
	move: (from: number, to: number) => void;
}>) {
	const [dragging, setDragging] = useState<number | null>(null);
	const current = useRef<number | null>(null);

	function indexAt(clientY: number): number | null {
		const rows = listRef.current?.children;
		if (!rows) return null;
		for (let i = 0; i < rows.length; i += 1) {
			const box = rows[i]?.getBoundingClientRect();
			if (box && clientY < box.top + box.height / 2) return i;
		}
		return rows.length - 1;
	}

	function end(event: PointerEvent<HTMLElement>) {
		if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		current.current = null;
		setDragging(null);
	}

	function handleProps(index: number) {
		return {
			onPointerDown(event: PointerEvent<HTMLElement>) {
				if (event.button !== 0) return;
				event.currentTarget.setPointerCapture?.(event.pointerId);
				current.current = index;
				setDragging(index);
			},
			onPointerMove(event: PointerEvent<HTMLElement>) {
				const from = current.current;
				if (from === null) return;
				const to = indexAt(event.clientY);
				if (to === null || to === from) return;
				move(from, to);
				current.current = to;
				setDragging(to);
			},
			onPointerUp: end,
			onPointerCancel: end,
		};
	}

	return { dragging, handleProps };
}

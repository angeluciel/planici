// Stub of `motion/react` for the swipe row tests (SPEC-0005 G-8). motion's drag
// needs pointer capture and layout sizes that jsdom does not provide, so a real
// drag cannot run. `motion.div` renders a plain div that remembers the
// `onDragEnd` it was given; a test then ends a "drag" with a chosen offset and
// velocity through `dragEnd`.
//
// vi.mock calls are hoisted per file, so each test file repeats the factory:
//   vi.mock("motion/react", async () => (await import("./swipe-row-stub")).motionStub());
//
// What the production SwipeRow must do for this stub to drive it: render its
// draggable surface as `motion.div` with `drag="x"` and an `onDragEnd` handler
// that reads `info.offset.x` and `info.velocity.x`. The stub marks every
// element that got a `drag` prop with `data-motion-drag`, so the tests find the
// surface without a production test id.

import { act } from "@testing-library/react";
import {
	type ComponentPropsWithoutRef,
	type ComponentPropsWithRef,
	createElement,
	forwardRef,
	type ReactNode,
	useCallback,
	useRef,
} from "react";

export type DragInfo = {
	point: { x: number; y: number };
	delta: { x: number; y: number };
	offset: { x: number; y: number };
	velocity: { x: number; y: number };
};

type DragEndHandler = (event: Event, info: DragInfo) => void;

const handlers = new WeakMap<Element, DragEndHandler>();

// props motion consumes; none of them is a DOM attribute
const MOTION_ONLY = new Set([
	"drag",
	"dragConstraints",
	"dragElastic",
	"dragMomentum",
	"dragDirectionLock",
	"dragSnapToOrigin",
	"dragControls",
	"dragTransition",
	"dragListener",
	"dragPropagation",
	"onDragStart",
	"onDrag",
	"onDragEnd",
	"onDirectionLock",
	"onDragTransitionEnd",
	"animate",
	"initial",
	"exit",
	"transition",
	"variants",
	"whileDrag",
	"whileTap",
	"whileHover",
	"layout",
	"layoutId",
	"style",
]);

const MotionDiv = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<"div"> & Record<string, unknown>
>(function MotionDiv(props, forwarded) {
	const own = useRef<HTMLDivElement | null>(null);
	const onDragEnd = props.onDragEnd as DragEndHandler | undefined;
	const drag = props.drag as string | boolean | undefined;

	const ref = useCallback(
		(node: HTMLDivElement | null) => {
			own.current = node;
			if (typeof forwarded === "function") forwarded(node);
			else if (forwarded) forwarded.current = node;
			if (node && onDragEnd) handlers.set(node, onDragEnd);
		},
		[forwarded, onDragEnd],
	);

	const dom: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(props)) {
		if (!MOTION_ONLY.has(key)) dom[key] = value;
	}
	return createElement("div", {
		...dom,
		ref,
		"data-motion-drag": drag ? String(drag) : undefined,
	});
});

/** The module factory for `vi.mock("motion/react", ...)`. */
export function motionStub() {
	const motion = new Proxy(
		{ div: MotionDiv },
		{
			get: (target, tag: string) =>
				tag in target
					? target[tag as "div"]
					: forwardRef<HTMLElement, ComponentPropsWithRef<"div">>(
							function Plain(props, ref) {
								return createElement(tag, { ...props, ref });
							},
						),
		},
	);
	return {
		motion,
		m: motion,
		AnimatePresence: ({ children }: { children?: ReactNode }) => children,
		useReducedMotion: () => false,
		useMotionValue: (initial: number) => {
			let value = initial;
			return {
				get: () => value,
				set: (next: number) => {
					value = next;
				},
			};
		},
		animate: () => ({ stop: () => undefined }),
	};
}

/** The draggable surface of a row: the element itself or the first one inside it. */
export function draggableOf(row: Element): HTMLElement {
	const found = row.matches("[data-motion-drag]")
		? row
		: row.querySelector("[data-motion-drag]");
	if (!found) throw new Error("no draggable surface in the row");
	return found as HTMLElement;
}

/** Every draggable surface of the document, in document order. */
export function draggables(): HTMLElement[] {
	return Array.from(
		document.querySelectorAll<HTMLElement>("[data-motion-drag]"),
	);
}

/**
 * Ends a drag on `surface` as motion would: `offset` and `velocity` are the x
 * values (negative is left; velocity in px/s).
 */
export function dragEnd(
	surface: Element,
	{ offset, velocity }: { offset: number; velocity: number },
) {
	const handler = handlers.get(surface);
	if (!handler) throw new Error("the surface has no onDragEnd handler");
	act(() => {
		handler(new Event("pointerup"), {
			point: { x: offset, y: 0 },
			delta: { x: offset, y: 0 },
			offset: { x: offset, y: 0 },
			velocity: { x: velocity, y: 0 },
		});
	});
}

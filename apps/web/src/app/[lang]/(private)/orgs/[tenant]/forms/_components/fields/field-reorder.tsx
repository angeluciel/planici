"use client";

import {
	type Announcements,
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	type Modifier,
	PointerSensor,
	type PointerSensorOptions,
	TouchSensor,
	type TouchSensorOptions,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	type PointerEvent,
	type ReactNode,
	type SyntheticEvent,
	type TouchEvent,
	useRef,
} from "react";
import { isCardControl } from "./field-card/field-card-interactions";

// SPEC-0002 §4.4 and §11 Decisions 8
const MOUSE_START_PX = 4;
const TOUCH_HOLD_MS = 300;
const TOUCH_SLOP_PX = 8;

// A press on one of the card's controls is left to the control. Presses inside
// a portal (the settings, a select) bubble to the card too and are ignored.
function pressOnCard({ currentTarget, target }: SyntheticEvent) {
	return (
		currentTarget instanceof Element &&
		target instanceof Node &&
		currentTarget.contains(target) &&
		!isCardControl(currentTarget, target)
	);
}

// Mouse and pen. Touch is left to CardTouchSensor, which waits for the hold.
class CardPointerSensor extends PointerSensor {
	static activators = [
		{
			eventName: "onPointerDown" as const,
			handler: (
				event: PointerEvent,
				{ onActivation }: PointerSensorOptions,
			) => {
				const { nativeEvent } = event;
				if (
					nativeEvent.pointerType === "touch" ||
					!nativeEvent.isPrimary ||
					nativeEvent.button !== 0 ||
					!pressOnCard(event)
				) {
					return false;
				}
				onActivation?.({ event: nativeEvent });
				return true;
			},
		},
	];
}

class CardTouchSensor extends TouchSensor {
	static activators = [
		{
			eventName: "onTouchStart" as const,
			handler: (event: TouchEvent, { onActivation }: TouchSensorOptions) => {
				const { nativeEvent } = event;
				if (nativeEvent.touches.length > 1 || !pressOnCard(event)) return false;
				onActivation?.({ event: nativeEvent });
				return true;
			},
		},
	];
}

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

// Keyboard users reorder with "Mover" (RNF-18), so there is no keyboard sensor
// and nothing to announce or explain about the pointer drag.
const silent: Announcements = {
	onDragStart: () => undefined,
	onDragOver: () => undefined,
	onDragEnd: () => undefined,
	onDragCancel: () => undefined,
};

// Drag a card by holding it, with dnd-kit. Mouse and pen pick the card up
// after a few pixels of movement; touch after a 300 ms hold, so a quick swipe
// still scrolls the page. While a card is dragged the others shift, and the
// page scrolls near the top or bottom edge. The order changes on drop.
// No transitions: motion is added app-wide later (owner, 2026-11-16).
export function FieldReorder({
	ids,
	move,
	disabled,
	onTap,
	children,
}: Readonly<{
	// the row keys, in order
	ids: string[];
	move: (from: number, to: number) => void;
	// no drag while the template is saving
	disabled: boolean;
	// a touch held and released without moving counts as a tap (§4.6 step 6)
	onTap: (id: string) => void;
	children: ReactNode;
}>) {
	const sensors = useSensors(
		useSensor(CardPointerSensor, {
			activationConstraint: { distance: MOUSE_START_PX },
		}),
		useSensor(CardTouchSensor, {
			activationConstraint: { delay: TOUCH_HOLD_MS, tolerance: TOUCH_SLOP_PX },
		}),
	);
	// whether the dragged card has been over another card's place
	const crossed = useRef(false);

	function onDragOver({ active, over }: DragOverEvent) {
		if (over && over.id !== active.id) crossed.current = true;
	}

	function onDragEnd({ active, over, activatorEvent }: DragEndEvent) {
		const wasCrossed = crossed.current;
		crossed.current = false;
		const from = ids.indexOf(String(active.id));
		const to = over ? ids.indexOf(String(over.id)) : -1;
		if (from >= 0 && to >= 0 && from !== to) {
			move(from, to);
			return;
		}
		if (!wasCrossed && activatorEvent.type === "touchstart") {
			onTap(String(active.id));
		}
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			modifiers={[verticalOnly]}
			accessibility={{
				announcements: silent,
				screenReaderInstructions: { draggable: "" },
			}}
			onDragOver={onDragOver}
			onDragEnd={onDragEnd}
			onDragCancel={() => {
				crossed.current = false;
			}}
		>
			<SortableContext
				items={ids}
				strategy={verticalListSortingStrategy}
				disabled={disabled}
			>
				{children}
			</SortableContext>
		</DndContext>
	);
}

// One card of FieldReorder: its node, its press listeners and its offset
// while the cards shift.
export function useSortableCard(id: string) {
	const { setNodeRef, listeners, transform, isDragging } = useSortable({
		id,
		transition: null,
	});
	return {
		setNodeRef,
		listeners,
		style: { transform: CSS.Translate.toString(transform) },
		dragging: isDragging,
	};
}

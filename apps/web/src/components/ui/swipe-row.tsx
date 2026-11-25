"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { animate, motion, type PanInfo, useMotionValue } from "motion/react";
import {
	createContext,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Menu, MenuItem } from "./menu";

// A list row that slides left to reveal actions. Touch: drag, or press and hold
// for the same actions in a menu. Keyboard and screen reader: the always
// present "⋯" menu; the revealed buttons are hidden from both while closed.

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 8;
const FLICK_VELOCITY = 500;
const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;

export type SwipeRowAction = {
	label: string;
	// shown above the label of the revealed button (a decorative icon)
	icon?: ReactNode;
	onSelect: () => void;
	tone?: "default" | "danger";
};

// open when dragged past half of the actions, or flicked left faster than
// 500 px/s; x values of the drag info (negative is left)
export function decideSnap({
	offset,
	velocity,
	actionsWidth,
}: {
	offset: number;
	velocity: number;
	actionsWidth: number;
}): "open" | "closed" {
	return -offset > actionsWidth / 2 || -velocity > FLICK_VELOCITY
		? "open"
		: "closed";
}

type GroupValue = {
	openId: string | null;
	setOpenId: (id: string | null) => void;
};

const GroupContext = createContext<GroupValue | null>(null);

// Owns which row is open. Closes it on a pointer down outside it and on any
// scroll (caught on window in the capture phase: the page scrolls, not the group).
export function SwipeRowGroup({ children }: Readonly<{ children: ReactNode }>) {
	const [openId, setOpenId] = useState<string | null>(null);

	useEffect(() => {
		if (openId === null) return;

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (
				target instanceof Element &&
				target.closest(`[data-swipe-row="${openId}"]`)
			)
				return;
			setOpenId(null);
		};
		const onScroll = () => setOpenId(null);

		document.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("scroll", onScroll, true);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("scroll", onScroll, true);
		};
	}, [openId]);

	const value = useMemo(() => ({ openId, setOpenId }), [openId]);

	return <GroupContext value={value}>{children}</GroupContext>;
}

export function SwipeRow({
	actions,
	menuLabel,
	onOpen,
	children,
}: Readonly<{
	actions: SwipeRowAction[];
	menuLabel: string;
	onOpen?: () => void;
	children: ReactNode;
}>) {
	const id = useId();
	const group = useContext(GroupContext);
	const [localOpen, setLocalOpen] = useState(false);
	const open = group ? group.openId === id : localOpen;
	const setOpen = useCallback(
		(next: boolean) => {
			if (group) group.setOpenId(next ? id : null);
			else setLocalOpen(next);
		},
		[group, id],
	);

	const actionsRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const x = useMotionValue(0);
	const [menuOpen, setMenuOpen] = useState(false);

	useLayoutEffect(() => {
		const node = actionsRef.current;
		if (!node) return;
		const measure = () => setWidth(node.offsetWidth);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	// follows the group: another row opening, or a scroll, closes this one
	useEffect(() => {
		animate(x, open ? -width : 0, SPRING);
	}, [open, width, x]);

	const press = useRef<{
		timer: ReturnType<typeof setTimeout>;
		x: number;
		y: number;
	} | null>(null);
	const longPressed = useRef(false);

	const cancelPress = useCallback(() => {
		if (!press.current) return;
		clearTimeout(press.current.timer);
		press.current = null;
	}, []);

	useEffect(() => cancelPress, [cancelPress]);

	const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		longPressed.current = false;
		cancelPress();
		if ((event.target as Element).closest("[data-swipe-menu]")) return;
		press.current = {
			x: event.clientX,
			y: event.clientY,
			timer: setTimeout(() => {
				press.current = null;
				longPressed.current = true;
				setMenuOpen(true);
			}, LONG_PRESS_MS),
		};
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!press.current) return;
		const moved = Math.hypot(
			event.clientX - press.current.x,
			event.clientY - press.current.y,
		);
		if (moved >= MOVE_TOLERANCE_PX) cancelPress();
	};

	const onDragEnd = (_event: unknown, info: PanInfo) => {
		cancelPress();
		const actionsWidth = actionsRef.current?.offsetWidth ?? width;
		const snap = decideSnap({
			offset: info.offset.x + (open ? -actionsWidth : 0),
			velocity: info.velocity.x,
			actionsWidth,
		});
		const next = snap === "open";
		animate(x, next ? -actionsWidth : 0, SPRING);
		if (next && !open) onOpen?.();
		setOpen(next);
	};

	return (
		<div
			data-swipe-row={id}
			data-open={open}
			className="relative overflow-hidden"
		>
			<div
				ref={actionsRef}
				aria-hidden={!open}
				inert={!open}
				className="absolute inset-y-0 right-0 flex"
			>
				{actions.map((action) => (
					<button
						key={action.label}
						type="button"
						onClick={() => {
							setOpen(false);
							action.onSelect();
						}}
						className={`flex min-w-20 cursor-pointer flex-col items-center justify-center gap-1 px-4 font-body-sm text-text-inverse focus-visible:outline-2 focus-visible:outline-border-focused ${
							action.tone === "danger"
								? "bg-background-status-danger-bold"
								: "bg-background-brand-bold"
						}`}
					>
						{action.icon}
						{action.label}
					</button>
				))}
			</div>
			<motion.div
				drag="x"
				dragConstraints={{ left: -width, right: 0 }}
				dragElastic={0.1}
				dragMomentum={false}
				style={{ x }}
				onDragStart={cancelPress}
				onDragEnd={onDragEnd}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={cancelPress}
				onPointerCancel={cancelPress}
				onClickCapture={(event: React.MouseEvent) => {
					// the click that ends a long press is not a tap
					if (!longPressed.current) return;
					longPressed.current = false;
					event.preventDefault();
					event.stopPropagation();
				}}
				className="relative flex touch-pan-y items-center bg-surface"
			>
				<div className="min-w-0 flex-1">{children}</div>
				<span data-swipe-menu="" className="shrink-0">
					<Menu
						label={menuLabel}
						trigger={
							<MoreHorizontalIcon aria-hidden="true" className="size-5" />
						}
						open={menuOpen}
						onOpenChange={setMenuOpen}
					>
						{actions.map((action) => (
							<MenuItem key={action.label} onSelect={action.onSelect}>
								{action.label}
							</MenuItem>
						))}
					</Menu>
				</span>
			</motion.div>
		</div>
	);
}

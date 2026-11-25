// W-swipe: SPEC-0005 AC-0005-91 to -95 (G-8), and the component's own half of
// AC-0005-103 and -104 (the "⋯" menu and the long press). `motion/react` is
// stubbed (swipe-row-stub.tsx): a test ends a drag with a chosen offset and
// velocity, so the snap rule and the group logic run in jsdom. The feel of the
// gesture on a phone is a manual check (Deferred checks).
//
// The contract these tests hold SwipeRow to (apps/web/src/components/ui/swipe-row.tsx):
// - `<SwipeRowGroup>` owns "which row is open"; `<SwipeRow actions menuLabel onOpen>`
//   takes `actions: { label: string; onSelect: () => void }[]` (more optional
//   fields allowed) and its children as the row's content.
// - The revealed actions are buttons named after their label. While the row is
//   closed they are hidden from assistive technology (`aria-hidden="true"` on
//   their container), so a role query finds them only on an open row.
// - A "⋯" button named `menuLabel` opens a menu (role "menu") with one menu item
//   per action; it is always available, open or closed.
// - The draggable surface is `motion.div` with `drag="x"` and `onDragEnd`; the
//   snap decision is `decideSnap({ offset, velocity, actionsWidth })` with the
//   x values of the drag info.
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decideSnap, SwipeRow, SwipeRowGroup } from "@/components/ui/swipe-row";
import { dragEnd, draggables } from "./swipe-row-stub";

vi.mock("motion/react", async () =>
	(await import("./swipe-row-stub")).motionStub(),
);

const ACTIONS_WIDTH = 160;
const restores: (() => void)[] = [];

// jsdom has no layout: every width the row could measure its actions by is 160
function stubWidths(width: number) {
	const rect = {
		width,
		height: 48,
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: width,
		bottom: 48,
		toJSON: () => ({}),
	} as DOMRect;
	for (const spy of [
		vi
			.spyOn(HTMLElement.prototype, "offsetWidth", "get")
			.mockReturnValue(width),
		vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(width),
		vi.spyOn(Element.prototype, "scrollWidth", "get").mockReturnValue(width),
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect),
	]) {
		restores.push(() => spy.mockRestore());
	}
}

beforeEach(() => stubWidths(ACTIONS_WIDTH));
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	for (const restore of restores.splice(0)) restore();
});

// ------------------------------------------------------------------ helpers

const press = (target: Element) => {
	fireEvent.pointerDown(target);
	fireEvent.click(target);
};

type Row = { name: string; onSelect?: () => void; onOpen?: () => void };

function Rows({ rows }: Readonly<{ rows: Row[] }>) {
	return (
		<SwipeRowGroup>
			<div>
				{rows.map(({ name, onSelect = () => undefined, onOpen }) => (
					<SwipeRow
						key={name}
						menuLabel={`Mais ações ${name}`}
						onOpen={onOpen}
						actions={[
							{ label: `Arquivar ${name}`, onSelect },
							{ label: `Excluir ${name}`, onSelect: () => undefined },
						]}
					>
						<span>{name}</span>
					</SwipeRow>
				))}
			</div>
			<button type="button">Fora</button>
		</SwipeRowGroup>
	);
}

const surfaceOf = (name: string): HTMLElement => {
	const surface = draggables().find((el) => within(el).queryByText(name));
	if (!surface) throw new Error(`no draggable surface for ${name}`);
	return surface;
};
const archive = (name: string) =>
	screen.queryByRole("button", { name: `Arquivar ${name}` });
const isOpen = (name: string) => archive(name) !== null;
const swipeOpen = (name: string) =>
	dragEnd(surfaceOf(name), { offset: -150, velocity: 0 });

// ----------------------------------------------------------------- the rule

describe("decideSnap", () => {
	const width = ACTIONS_WIDTH;

	it.each([
		[-100, 0],
		[-81, 0],
		[-160, 0],
		[-400, 0],
	])("AC-0005-91 opens a slow drag of %i px past half of %i px", (offset, velocity) => {
		expect(decideSnap({ offset, velocity, actionsWidth: width })).toBe("open");
	});

	it.each([
		[-79, 0],
		[-80, 0],
		[-40, -100],
		[-1, 0],
		[0, 0],
		[50, 0],
	])("AC-0005-92 closes a slow drag of %i px (velocity %i) that stays within half", (offset, velocity) => {
		expect(decideSnap({ offset, velocity, actionsWidth: width })).toBe(
			"closed",
		);
	});

	it.each([
		[-30, -501],
		[-30, -800],
		[-1, -2000],
		[0, -600],
	])("AC-0005-93 opens a short drag of %i px flicked left at %i px/s", (offset, velocity) => {
		expect(decideSnap({ offset, velocity, actionsWidth: width })).toBe("open");
	});

	it.each([
		[-30, -500],
		[-30, -300],
		[-30, 800],
	])("AC-0005-93 keeps closed a short drag of %i px at %i px/s, which is not a fast left flick", (offset, velocity) => {
		expect(decideSnap({ offset, velocity, actionsWidth: width })).toBe(
			"closed",
		);
	});

	it("AC-0005-91 follows the width of the actions: 100 px is past half of 160 but not of 240", () => {
		expect(decideSnap({ offset: -100, velocity: 0, actionsWidth: 160 })).toBe(
			"open",
		);
		expect(decideSnap({ offset: -100, velocity: 0, actionsWidth: 240 })).toBe(
			"closed",
		);
	});
});

// -------------------------------------------------------------- the row

describe("SwipeRow", () => {
	it("AC-0005-92 starts closed: its actions are not reachable", () => {
		render(<Rows rows={[{ name: "Facial" }]} />);

		expect(screen.getByText("Facial")).toBeTruthy();
		expect(archive("Facial")).toBeNull();
		expect(screen.queryByRole("button", { name: "Excluir Facial" })).toBeNull();
	});

	it("AC-0005-91 stays open showing its actions after a slow drag past half of them", () => {
		const onOpen = vi.fn();
		render(<Rows rows={[{ name: "Facial", onOpen }]} />);

		dragEnd(surfaceOf("Facial"), { offset: -150, velocity: 0 });

		expect(
			screen.getByRole("button", { name: "Arquivar Facial" }),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "Excluir Facial" })).toBeTruthy();
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("AC-0005-92 snaps closed after a slow drag within half of the actions", () => {
		const onOpen = vi.fn();
		render(<Rows rows={[{ name: "Facial", onOpen }]} />);

		dragEnd(surfaceOf("Facial"), { offset: -30, velocity: -100 });

		expect(isOpen("Facial")).toBe(false);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("AC-0005-92 snaps an open row closed when it is dragged back right", () => {
		render(<Rows rows={[{ name: "Facial" }]} />);
		swipeOpen("Facial");
		expect(isOpen("Facial")).toBe(true);

		dragEnd(surfaceOf("Facial"), { offset: 120, velocity: 0 });

		expect(isOpen("Facial")).toBe(false);
	});

	it("AC-0005-93 snaps open after a short but fast flick left", () => {
		render(<Rows rows={[{ name: "Facial" }]} />);

		dragEnd(surfaceOf("Facial"), { offset: -30, velocity: -800 });

		expect(isOpen("Facial")).toBe(true);
	});

	it("AC-0005-91 runs the action's callback when its button is pressed", () => {
		const onSelect = vi.fn();
		render(<Rows rows={[{ name: "Facial", onSelect }]} />);
		swipeOpen("Facial");

		press(screen.getByRole("button", { name: "Arquivar Facial" }));

		expect(onSelect).toHaveBeenCalledTimes(1);
	});
});

// -------------------------------------------------------------- the group

describe("SwipeRowGroup", () => {
	it("AC-0005-94 closes the open row when another row is opened", () => {
		render(<Rows rows={[{ name: "Facial" }, { name: "Peeling" }]} />);
		swipeOpen("Facial");
		expect(isOpen("Facial")).toBe(true);

		swipeOpen("Peeling");

		expect(isOpen("Peeling")).toBe(true);
		expect(isOpen("Facial")).toBe(false);
	});

	it("AC-0005-94 keeps one open row when the opened row is opened again", () => {
		render(<Rows rows={[{ name: "Facial" }, { name: "Peeling" }]} />);
		swipeOpen("Facial");

		swipeOpen("Facial");

		expect(isOpen("Facial")).toBe(true);
		expect(isOpen("Peeling")).toBe(false);
	});

	it("AC-0005-95 closes the open row on a pointer down outside it", () => {
		render(<Rows rows={[{ name: "Facial" }, { name: "Peeling" }]} />);
		swipeOpen("Facial");

		fireEvent.pointerDown(screen.getByRole("button", { name: "Fora" }));

		expect(isOpen("Facial")).toBe(false);
	});

	it("AC-0005-95 closes the open row on a pointer down on another row", () => {
		render(<Rows rows={[{ name: "Facial" }, { name: "Peeling" }]} />);
		swipeOpen("Facial");

		fireEvent.pointerDown(screen.getByText("Peeling"));

		expect(isOpen("Facial")).toBe(false);
	});

	it("AC-0005-95 keeps the row open on a pointer down inside it", () => {
		render(<Rows rows={[{ name: "Facial" }]} />);
		swipeOpen("Facial");

		fireEvent.pointerDown(
			screen.getByRole("button", { name: "Excluir Facial" }),
		);
		fireEvent.pointerDown(screen.getByText("Facial"));

		expect(isOpen("Facial")).toBe(true);
	});

	it("AC-0005-95 closes the open row when the window scrolls", () => {
		render(<Rows rows={[{ name: "Facial" }]} />);
		swipeOpen("Facial");

		fireEvent.scroll(window);

		expect(isOpen("Facial")).toBe(false);
	});

	it("AC-0005-95 closes the open row when an element inside the page scrolls (caught in the capture phase)", () => {
		render(
			<div data-testid="scroller">
				<Rows rows={[{ name: "Facial" }]} />
			</div>,
		);
		swipeOpen("Facial");

		fireEvent.scroll(screen.getByTestId("scroller"));

		expect(isOpen("Facial")).toBe(false);
	});
});

// ------------------------------------------- the "⋯" menu and the long press

describe("Row menu", () => {
	it("AC-0005-103 opens a menu with the row's actions from the ⋯ button, on a closed row", async () => {
		render(<Rows rows={[{ name: "Facial" }]} />);

		press(screen.getByRole("button", { name: "Mais ações Facial" }));

		const menu = await screen.findByRole("menu");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((el) => el.textContent?.trim()),
		).toEqual(["Arquivar Facial", "Excluir Facial"]);
	});

	it("AC-0005-103 runs the action of the menu item that is chosen", async () => {
		const onSelect = vi.fn();
		render(<Rows rows={[{ name: "Facial", onSelect }]} />);
		press(screen.getByRole("button", { name: "Mais ações Facial" }));

		fireEvent.click(
			await screen.findByRole("menuitem", { name: "Arquivar Facial" }),
		);

		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it("AC-0005-104 opens the same menu after a long press of 500 ms", async () => {
		render(<Rows rows={[{ name: "Facial" }]} />);
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

		fireEvent.pointerDown(surfaceOf("Facial"), {
			pointerId: 1,
			pointerType: "touch",
			clientX: 40,
			clientY: 20,
		});
		vi.advanceTimersByTime(499);
		expect(screen.queryByRole("menu")).toBeNull();
		vi.advanceTimersByTime(1);
		vi.runOnlyPendingTimers();
		vi.useRealTimers();

		const menu = await screen.findByRole("menu");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((el) => el.textContent?.trim()),
		).toEqual(["Arquivar Facial", "Excluir Facial"]);
	});

	it("AC-0005-104 opens no menu when the press is released before 500 ms", () => {
		render(<Rows rows={[{ name: "Facial" }]} />);
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		const surface = surfaceOf("Facial");

		fireEvent.pointerDown(surface, { pointerId: 1, clientX: 40, clientY: 20 });
		vi.advanceTimersByTime(300);
		fireEvent.pointerUp(surface, { pointerId: 1, clientX: 40, clientY: 20 });
		vi.advanceTimersByTime(1000);

		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("AC-0005-104 opens no menu when the finger moves 8 px before 500 ms", () => {
		render(<Rows rows={[{ name: "Facial" }]} />);
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		const surface = surfaceOf("Facial");

		fireEvent.pointerDown(surface, { pointerId: 1, clientX: 40, clientY: 20 });
		vi.advanceTimersByTime(300);
		fireEvent.pointerMove(surface, { pointerId: 1, clientX: 48, clientY: 20 });
		vi.advanceTimersByTime(1000);

		expect(screen.queryByRole("menu")).toBeNull();
	});
});

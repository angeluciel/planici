export const CARD_CONTROLS =
	"input, textarea, select, button, a, label, [role=switch], [role=combobox], [role=option], [role=menuitem]";

export function isCardControl(card: Element, target: EventTarget | null) {
	if (!(target instanceof Element)) return false;

	const control = target.closest<HTMLElement>(CARD_CONTROLS);

	return (
		control !== null &&
		!("cardActivate" in control.dataset) &&
		card.contains(control)
	);
}

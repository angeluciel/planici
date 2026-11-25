import { ListBadges } from "../../_components/list/list-parts";

// "Inativo", then the template badge, shared by row and card (SPEC-0006 R6).
export function ClientBadges(
	props: Readonly<{ inactive: boolean; formName: string }>,
) {
	return <ListBadges namespace="clients" {...props} />;
}

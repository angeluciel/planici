import { ListBadges } from "../../_components/list/list-parts";

// "Arquivado", then the template badge (SPEC-0005 §4.1 step 1, R16).
export function ServiceBadges(
	props: Readonly<{ inactive: boolean; formName: string }>,
) {
	return <ListBadges namespace="services" {...props} />;
}

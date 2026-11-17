import type { DraftField } from "../field-model";
import { sensitiveLockOf } from "../field-protection";

// The label change that keeps protection in step with the label (§4.3): a
// label that matches a protected term turns "Dado protegido" on.
export function withLabel(field: DraftField, label: string): DraftField {
	return {
		...field,
		label,
		...(sensitiveLockOf({ ...field, label }) && field.sensitive !== true
			? { sensitive: true }
			: {}),
	};
}

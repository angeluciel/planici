import type { ApiFailure } from "@/lib/api/client";

export function isConflict(failure: ApiFailure): boolean {
	return failure.error === "form.revision-conflict";
}

// the failure says the template's records changed under an open dialog
export function isRecordsChanged(failure: ApiFailure): boolean {
	return (
		failure.error === "form.in-use" ||
		failure.error === "form.records-have-history"
	);
}

"use client";

import { useForm } from "react-hook-form";
import { useLeaveGuard } from "@/hooks/use-leave-guard";
import type { FormDraft } from "../_lib/draft";

// The editor's draft: react-hook-form state, a dirty flag that goes back to
// false when the values match the last saved ones, and the leave guard.
export function useFormDraft(initial: FormDraft) {
	const form = useForm<FormDraft>({ defaultValues: initial });
	const dirty = form.formState.isDirty;
	const guard = useLeaveGuard({ dirty, messageKey: "forms.editor.unsaved" });

	return { form, dirty, guard };
}

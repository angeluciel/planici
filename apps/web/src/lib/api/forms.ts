import {
	type CreateFormRequestInput,
	type DeleteFormRequestInput,
	type FormChangePreviewResponse,
	FormChangePreviewResponseSchema,
	FormListResponseSchema,
	type FormTemplate,
	FormTemplateSchema,
	type FormTemplateSummary,
	type FormType,
	type FormVersionResponse,
	FormVersionResponseSchema,
	type PreviewFormChangesRequestInput,
	type UpdateFormRequestInput,
} from "@planici/schemas";
import type { z } from "zod";
import { type ApiFailure, apiFailure, createSessionClient } from "./client";

export const formsClient = createSessionClient("/api/forms");

export type FormResult = { ok: true; form: FormTemplate } | ApiFailure;
export type FormListResult =
	| { ok: true; forms: FormTemplateSummary[] }
	| ApiFailure;
export type FormPreviewResult =
	| { ok: true; preview: FormChangePreviewResponse }
	| ApiFailure;
export type FormVersionResult =
	| { ok: true; version: FormVersionResponse }
	| ApiFailure;
export type FormVoidResult = { ok: true } | ApiFailure;

const UNEXPECTED: ApiFailure = { ok: false, error: "unexpected" };

function parsed<T>(schema: z.ZodType<T>, data: unknown): T | null {
	const result = schema.safeParse(data);
	return result.success ? result.data : null;
}

function asForm(data: unknown): FormResult {
	const form = parsed(FormTemplateSchema, data);
	return form ? { ok: true, form } : UNEXPECTED;
}

const path = (id: string) => `/${encodeURIComponent(id)}`;

export async function listForms(
	options: { type?: FormType; includeArchived?: boolean } = {},
): Promise<FormListResult> {
	try {
		const params: Record<string, string> = {};
		if (options.type) params.type = options.type;
		if (options.includeArchived) params.includeArchived = "true";

		const response = await formsClient.get<unknown>("", { params });
		const list = parsed(FormListResponseSchema, response.data);
		return list ? { ok: true, forms: list.forms } : UNEXPECTED;
	} catch (error) {
		return apiFailure(error);
	}
}

export async function getForm(id: string): Promise<FormResult> {
	try {
		const response = await formsClient.get<unknown>(path(id));
		return asForm(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function createForm(
	body: CreateFormRequestInput,
): Promise<FormResult> {
	try {
		const response = await formsClient.post<unknown>("", body);
		return asForm(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function previewFormChanges(
	id: string,
	body: PreviewFormChangesRequestInput,
): Promise<FormPreviewResult> {
	try {
		const response = await formsClient.post<unknown>(
			`${path(id)}/preview`,
			body,
		);
		const preview = parsed(FormChangePreviewResponseSchema, response.data);
		return preview ? { ok: true, preview } : UNEXPECTED;
	} catch (error) {
		return apiFailure(error);
	}
}

export async function updateForm(
	id: string,
	body: UpdateFormRequestInput,
): Promise<FormResult> {
	try {
		const response = await formsClient.patch<unknown>(path(id), body);
		return asForm(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function getFormVersion(
	id: string,
	version: number,
): Promise<FormVersionResult> {
	try {
		const response = await formsClient.get<unknown>(
			`${path(id)}/versions/${version}`,
		);
		const result = parsed(FormVersionResponseSchema, response.data);
		return result ? { ok: true, version: result } : UNEXPECTED;
	} catch (error) {
		return apiFailure(error);
	}
}

export async function archiveForm(id: string): Promise<FormResult> {
	try {
		const response = await formsClient.post<unknown>(`${path(id)}/archive`);
		return asForm(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function unarchiveForm(id: string): Promise<FormResult> {
	try {
		const response = await formsClient.post<unknown>(`${path(id)}/unarchive`);
		return asForm(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function deleteForm(
	id: string,
	body: DeleteFormRequestInput,
): Promise<FormVoidResult> {
	try {
		await formsClient.post(`${path(id)}/delete`, body);
		return { ok: true };
	} catch (error) {
		return apiFailure(error);
	}
}

import {
	type DeleteServiceRequestInput,
	type ServiceCreateRequestInput,
	type ServiceListResponse,
	ServiceListResponseSchema,
	type ServiceResponse,
	ServiceSchema,
	type ServiceSort,
	type ServiceStatusFilter,
	type ServiceTemplateSummary,
	ServiceTemplateSummarySchema,
	type ServiceUpdateRequestInput,
} from "@planici/schemas";
import type { z } from "zod";
import { type ApiFailure, apiFailure, createSessionClient } from "./client";

export const servicesClient = createSessionClient("/api/services");

export type ServiceResult = { ok: true; service: ServiceResponse } | ApiFailure;
export type ServiceListResult =
	| { ok: true; list: ServiceListResponse }
	| ApiFailure;
export type ServiceTemplatesResult =
	| { ok: true; summary: ServiceTemplateSummary }
	| ApiFailure;
export type ServiceVoidResult = { ok: true } | ApiFailure;

export type ListServicesParams = {
	q?: string;
	status?: ServiceStatusFilter;
	formId?: string;
	sort?: ServiceSort;
	limit?: number;
	after?: string;
};

const UNEXPECTED: ApiFailure = { ok: false, error: "unexpected" };

function parsed<T>(schema: z.ZodType<T>, data: unknown): T | null {
	const result = schema.safeParse(data);
	return result.success ? result.data : null;
}

function asService(data: unknown): ServiceResult {
	const service = parsed(ServiceSchema, data);
	return service ? { ok: true, service } : UNEXPECTED;
}

const path = (id: string) => `/${encodeURIComponent(id)}`;

export async function listServices(
	options: ListServicesParams = {},
): Promise<ServiceListResult> {
	try {
		const params: Record<string, string> = {};
		if (options.q) params.q = options.q;
		if (options.status) params.status = options.status;
		if (options.formId) params.formId = options.formId;
		if (options.sort) params.sort = options.sort;
		if (options.limit) params.limit = String(options.limit);
		if (options.after) params.after = options.after;

		const response = await servicesClient.get<unknown>("", { params });
		const list = parsed(ServiceListResponseSchema, response.data);
		return list ? { ok: true, list } : UNEXPECTED;
	} catch (error) {
		return apiFailure(error);
	}
}

export async function getServiceTemplates(): Promise<ServiceTemplatesResult> {
	try {
		const response = await servicesClient.get<unknown>("/templates");
		const summary = parsed(ServiceTemplateSummarySchema, response.data);
		return summary ? { ok: true, summary } : UNEXPECTED;
	} catch (error) {
		return apiFailure(error);
	}
}

export async function createService(
	body: ServiceCreateRequestInput,
): Promise<ServiceResult> {
	try {
		const response = await servicesClient.post<unknown>("", body);
		return asService(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function getService(id: string): Promise<ServiceResult> {
	try {
		const response = await servicesClient.get<unknown>(path(id));
		return asService(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function updateService(
	id: string,
	body: ServiceUpdateRequestInput,
): Promise<ServiceResult> {
	try {
		const response = await servicesClient.patch<unknown>(path(id), body);
		return asService(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function inactivateService(id: string): Promise<ServiceResult> {
	try {
		const response = await servicesClient.post<unknown>(
			`${path(id)}/inactivate`,
		);
		return asService(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function reactivateService(id: string): Promise<ServiceResult> {
	try {
		const response = await servicesClient.post<unknown>(
			`${path(id)}/reactivate`,
		);
		return asService(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function deleteService(
	id: string,
	body: DeleteServiceRequestInput,
): Promise<ServiceVoidResult> {
	try {
		await servicesClient.post(`${path(id)}/delete`, body);
		return { ok: true };
	} catch (error) {
		return apiFailure(error);
	}
}

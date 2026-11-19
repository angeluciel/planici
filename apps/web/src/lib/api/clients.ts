import {
	ClientConsentTextSchema,
	type ClientCreateRequestInput,
	type ClientListResponse,
	ClientListResponseSchema,
	type ClientResponse,
	ClientSchema,
	type ClientStatusFilter,
	type ClientUpdateRequestInput,
	type DeleteClientRequestInput,
} from "@planici/schemas";
import type { z } from "zod";
import { type ApiFailure, apiFailure, createSessionClient } from "./client";

export const clientsClient = createSessionClient("/api/clients");

export type ClientResult = { ok: true; client: ClientResponse } | ApiFailure;
export type ClientListResult =
	| { ok: true; list: ClientListResponse }
	| ApiFailure;
export type ClientVoidResult = { ok: true } | ApiFailure;
export type ConsentTextResult =
	| { ok: true; version: string; text: string }
	| ApiFailure;

export type ListClientsParams = {
	q?: string;
	status?: ClientStatusFilter;
	limit?: number;
	after?: string;
};

const UNEXPECTED: ApiFailure = { ok: false, error: "unexpected" };

function parsed<T>(schema: z.ZodType<T>, data: unknown): T | null {
	const result = schema.safeParse(data);
	return result.success ? result.data : null;
}

function asClient(data: unknown): ClientResult {
	const client = parsed(ClientSchema, data);
	return client ? { ok: true, client } : UNEXPECTED;
}

const path = (id: string) => `/${encodeURIComponent(id)}`;

export async function listClients(
	options: ListClientsParams = {},
): Promise<ClientListResult> {
	try {
		const params: Record<string, string> = {};
		if (options.q) params.q = options.q;
		if (options.status) params.status = options.status;
		if (options.limit) params.limit = String(options.limit);
		if (options.after) params.after = options.after;

		const response = await clientsClient.get<unknown>("", { params });
		const list = parsed(ClientListResponseSchema, response.data);
		return list ? { ok: true, list } : UNEXPECTED;
	} catch (error) {
		return apiFailure(error);
	}
}

export async function createClient(
	body: ClientCreateRequestInput,
): Promise<ClientResult> {
	try {
		const response = await clientsClient.post<unknown>("", body);
		return asClient(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function getClient(id: string): Promise<ClientResult> {
	try {
		const response = await clientsClient.get<unknown>(path(id));
		return asClient(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function updateClient(
	id: string,
	body: ClientUpdateRequestInput,
): Promise<ClientResult> {
	try {
		const response = await clientsClient.patch<unknown>(path(id), body);
		return asClient(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function inactivateClient(id: string): Promise<ClientResult> {
	try {
		const response = await clientsClient.post<unknown>(
			`${path(id)}/inactivate`,
		);
		return asClient(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function reactivateClient(id: string): Promise<ClientResult> {
	try {
		const response = await clientsClient.post<unknown>(
			`${path(id)}/reactivate`,
		);
		return asClient(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function deleteClient(
	id: string,
	body: DeleteClientRequestInput,
): Promise<ClientVoidResult> {
	try {
		await clientsClient.post(`${path(id)}/delete`, body);
		return { ok: true };
	} catch (error) {
		return apiFailure(error);
	}
}

export async function getConsentText(): Promise<ConsentTextResult> {
	try {
		const response = await clientsClient.get<unknown>("/consent");
		const consent = parsed(ClientConsentTextSchema, response.data);
		return consent ? { ok: true, ...consent } : UNEXPECTED;
	} catch (error) {
		return apiFailure(error);
	}
}

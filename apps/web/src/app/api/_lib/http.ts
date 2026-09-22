import type { ApiErrorBody } from "@planici/schemas";
import axios, { type AxiosResponse, type RawAxiosRequestHeaders } from "axios";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ErrorBodySchema = z.object({
	error: z.string(),
	field: z.string().optional(),
});

export class ApiError extends Error {
	readonly status: number;
	readonly body: ApiErrorBody;
	readonly retryAfter: string | null;

	constructor(
		status: number,
		body?: ApiErrorBody,
		retryAfter: string | null = null,
	) {
		const resolvedBody = body ?? { error: "unexpected" };

		super(resolvedBody.error);
		this.status = status;
		this.body = resolvedBody;
		this.retryAfter = retryAfter;
	}
}

export function requiredEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new ApiError(500);
	return value;
}

export function errorResponse(error: unknown): NextResponse {
	const failure = error instanceof ApiError ? error : new ApiError(500);
	const response = NextResponse.json(failure.body, {
		status: failure.status,
	});

	if (failure.retryAfter) {
		response.headers.set("Retry-After", failure.retryAfter);
	}

	return response;
}

export function route(
	handler: (request: NextRequest) => Promise<NextResponse>,
) {
	return async (request: NextRequest): Promise<NextResponse> => {
		let response: NextResponse;

		try {
			if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
				const origin = new URL(requiredEnv("WEB_APP_URL")).origin;

				if (request.headers.get("origin") !== origin) {
					throw new ApiError(403);
				}
			}

			response = await handler(request);
		} catch (error) {
			response = errorResponse(error);
		}

		response.headers.set("Cache-Control", "no-store");
		return response;
	};
}

export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
	const parsed = schema.safeParse(value);
	if (parsed.success) return parsed.data;

	const issue = parsed.error.issues[0];
	const message = issue?.message.trim() ?? "unexpected";
	const field = issue?.path[0];

	throw new ApiError(400, {
		error: /^[\w-]+(?:\.[\w-]+)+$/.test(message) ? message : "unexpected",
		...(typeof field === "string" ? { field } : {}),
	});
}

export async function readBody<T>(
	request: NextRequest,
	schema: z.ZodType<T>,
): Promise<T> {
	const contentType = request.headers
		.get("content-type")
		?.split(";")[0]
		?.trim();

	if (contentType?.toLowerCase() !== "application/json") {
		throw new ApiError(415);
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		throw new ApiError(400);
	}

	return parseInput(schema, body);
}

export function parseUpstream<T>(schema: z.ZodType<T>, value: unknown): T {
	const parsed = schema.safeParse(value);
	if (!parsed.success) throw new ApiError(502);
	return parsed.data;
}

type ApiOptions = {
	method?: "GET" | "POST";
	body?: unknown;
	token?: string;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function api(
	path: string,
	{ method = "POST", body, token }: ApiOptions = {},
): Promise<unknown> {
	const base = requiredEnv("API_URL").replace(/\/+$/, "");
	const headers: RawAxiosRequestHeaders = {
		Accept: "application/json",
		"Content-Type": body === undefined ? null : "application/json",
	};

	if (token) headers.Authorization = `Bearer ${token}`;

	let response: AxiosResponse<string>;

	try {
		response = await axios.request<string>({
			url: `${base}/auth${path}`,
			method,
			headers,
			data: body,
			timeout: 10_000,
			maxRedirects: 0,
			validateStatus: () => true,
			transformResponse: [],
		});
	} catch (error) {
		const timedOut =
			axios.isAxiosError(error) &&
			["ECONNABORTED", "ETIMEDOUT"].includes(error.code ?? "");

		throw new ApiError(timedOut ? 504 : 502);
	}

	if (REDIRECT_STATUSES.has(response.status)) throw new ApiError(502);

	const text = response.data;
	let data: unknown = null;

	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		// A non-JSON error body must not reach the browser.
	}

	if (response.status < 200 || response.status > 299) {
		const parsed = ErrorBodySchema.safeParse(data);

		throw new ApiError(
			response.status,
			parsed.success
				? parsed.data
				: {
						error: response.status === 429 ? "code.rate-limited" : "unexpected",
					},
			(response.headers["retry-after"] as string | undefined) ?? null,
		);
	}

	return data;
}

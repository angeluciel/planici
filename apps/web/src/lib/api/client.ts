import "client-only";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { z } from "zod";

// request do navegador vai pro next, sessão e url da api fica no servidor
export const authClient = axios.create({
	baseURL: "/api/auth",
	timeout: 15_000,
});

type SessionRequest = InternalAxiosRequestConfig & {
	_sessionRetried?: boolean;
	_refreshVersion?: number;
};

let refreshPromise: Promise<void> | null = null;
let refreshVersion = 0;

function refreshSession(): Promise<void> {
	refreshPromise ??= authClient
		.post("/refresh")
		.then(() => {
			refreshVersion += 1;
		})
		.finally(() => {
			refreshPromise = null;
		});
	return refreshPromise;
}

export function createSessionClient(baseURL: string) {
	const client = axios.create({
		baseURL,
		timeout: 15_000,
	});

	client.interceptors.request.use((config) => {
		(config as SessionRequest)._refreshVersion = refreshVersion;
		return config;
	});

	client.interceptors.response.use(
		(response) => response,
		async (error: unknown) => {
			if (!axios.isAxiosError(error)) throw error;

			const config = error.config as SessionRequest | undefined;

			if (!config || error.response?.status !== 401 || config._sessionRetried) {
				throw error;
			}

			config._sessionRetried = true;

			if (config._refreshVersion === refreshVersion) {
				await refreshSession();
			}

			return client.request(config);
		},
	);

	return client;
}

export const sessionClient = createSessionClient("/api/auth");

export type ApiFailure = {
	ok: false;
	error: string;
	field?: string;
	retryAfter?: number;
};

const ErrorSchema = z.object({
	error: z.string(),
	field: z.string().optional(),
});

export function apiFailure(error: unknown): ApiFailure {
	if (error instanceof z.ZodError) {
		const issue = error.issues[0];
		const message = issue?.message.trim() ?? "unexpected";
		const field = issue?.path[0] === "consent" ? issue.path[1] : issue?.path[0];
		return {
			ok: false,
			error: /^[\w-]+(?:\.[\w-]+)+$/.test(message) ? message : "unexpected",
			...(typeof field === "string" ? { field } : {}),
		};
	}
	if (!axios.isAxiosError(error)) return { ok: false, error: "unexpected" };
	const parsed = ErrorSchema.safeParse(error.response?.data);
	const header = error.response?.headers["retry-after"];
	const seconds =
		typeof header === "string" && !/^\d+$/.test(header)
			? Math.ceil((Date.parse(header) - Date.now()) / 1000)
			: Number(header);

	return {
		ok: false,
		...(parsed.success
			? parsed.data
			: {
					error: error.response ? "unexpected" : "network.unavailable",
				}),
		...(Number.isFinite(seconds) && seconds > 0
			? { retryAfter: Math.ceil(seconds) }
			: {}),
	};
}

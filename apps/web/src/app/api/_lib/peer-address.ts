import { randomBytes } from "node:crypto";
import { subscribe } from "node:diagnostics_channel";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";

// SPEC-0009 P-1. Next.js gives route handlers no socket address, and it keeps
// a forged X-Forwarded-For instead of the real peer. This capture runs on
// Node's `http.server.request.start` channel, before Next.js reads the request,
// and writes the socket address into PEER_HEADER on every request, replacing
// whatever the browser sent.
//
// Next.js accepts connections before `register()` runs, so a request can reach
// a route without passing here. The header then still holds the browser's
// value, which cannot carry the per-process secret, so client-address.ts
// rejects it. The secret lives on globalThis because the instrumentation
// bundle and the route bundles do not share module state. It is never logged,
// forwarded to the API or returned.

export const PEER_HEADER = "x-planici-peer";
export const PEER_SECRET_KEY = Symbol.for("planici.peer-secret");

const STARTED_KEY = Symbol.for("planici.peer-capture-started");

type Store = Record<symbol, unknown>;

type RequestStart = { request: IncomingMessage; socket: Socket };

export function startPeerCapture(): void {
	const store = globalThis as Store;
	if (store[STARTED_KEY] === true) return;

	const secret = randomBytes(32).toString("base64url");
	store[PEER_SECRET_KEY] = secret;
	store[STARTED_KEY] = true;

	subscribe("http.server.request.start", (message) => {
		const { request, socket } = message as RequestStart;
		request.headers[PEER_HEADER] = `${secret} ${socket.remoteAddress ?? ""}`;
	});
}

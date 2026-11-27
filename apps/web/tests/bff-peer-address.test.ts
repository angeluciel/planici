// @vitest-environment node
// SPEC-0009 P-1: the capture that records the socket address of every request
// before Next.js reads it (src/app/api/_lib/peer-address.ts). Runs against a
// real node:http server, because the capture hooks the server's own channel.
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPeerCapture } from "@/app/api/_lib/peer-address";

const SECRET_KEY = Symbol.for("planici.peer-secret");
const secretInProcess = () =>
	(globalThis as Record<symbol, unknown>)[SECRET_KEY];

let server: Server;
let port: number;
let seen: (string | string[] | undefined)[] = [];

beforeAll(async () => {
	startPeerCapture();
	server = createServer((req, res) => {
		seen.push(req.headers["x-planici-peer"]);
		res.end("ok");
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

function get(headers: Record<string, string> = {}) {
	return new Promise<string | string[] | undefined>((resolve, reject) => {
		seen = [];
		const call = request(
			{ host: "127.0.0.1", port, path: "/", headers },
			(response) => {
				response.resume();
				response.on("end", () => resolve(seen[0]));
			},
		);
		call.on("error", reject);
		call.end();
	});
}

describe("startPeerCapture", () => {
	it("writes the process secret with the socket address", async () => {
		const secret = secretInProcess();

		expect(secret).toEqual(expect.stringMatching(/^[A-Za-z0-9_-]{43}$/));
		expect(await get()).toBe(`${secret} 127.0.0.1`);
	});

	it("AC-0009-14 AC-0009-17 replaces a forged peer header with the socket address", async () => {
		const secret = secretInProcess();

		const header = await get({ "x-planici-peer": "forged 203.0.113.99" });

		expect(header).toBe(`${secret} 127.0.0.1`);
	});

	it("creates the secret only once per process", async () => {
		const first = secretInProcess();

		startPeerCapture();
		startPeerCapture();

		expect(secretInProcess()).toBe(first);
		expect(await get()).toBe(`${first} 127.0.0.1`);
	});
});

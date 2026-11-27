// @vitest-environment node
// SPEC-0009 P-3: how the web app decides the client address of a browser
// request (src/app/api/_lib/client-address.ts). The peer header carries the
// process secret and the socket address the capture wrote (peer-address.ts);
// the entry point is recognized by ENTRY_PROXY_RANGES.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveClientAddress } from "@/app/api/_lib/client-address";

const SECRET_KEY = Symbol.for("planici.peer-secret");
const SECRET = "test-secret-0123456789abcdefghijklmnopqrstu";
const ENTRY_RANGES = "10.0.0.0/24,10.0.1.0/24";
const LOAD_BALANCER = "10.0.0.15";
const CLOUDFLARE_EDGE = "173.245.48.10";

type Chain = {
	peer?: string;
	forwardedFor?: string;
	connectingIp?: string;
	realIp?: string;
	secret?: string;
};

function requestHeaders({
	peer,
	forwardedFor,
	connectingIp,
	realIp,
	secret = SECRET,
}: Chain): Headers {
	const headers = new Headers();
	if (peer !== undefined) headers.set("x-planici-peer", `${secret} ${peer}`);
	if (forwardedFor !== undefined) headers.set("x-forwarded-for", forwardedFor);
	if (connectingIp !== undefined) headers.set("cf-connecting-ip", connectingIp);
	if (realIp !== undefined) headers.set("x-real-ip", realIp);
	return headers;
}

// a request through Cloudflare and the load balancer, which appends the
// address that connected to it to X-Forwarded-For
function throughCloudflare(
	device: string,
	extra: Chain = {},
	edge = CLOUDFLARE_EDGE,
): Headers {
	return requestHeaders({
		peer: LOAD_BALANCER,
		forwardedFor: `${device}, ${edge}`,
		connectingIp: device,
		...extra,
	});
}

function setSecret(value: string | undefined) {
	(globalThis as Record<symbol, unknown>)[SECRET_KEY] = value;
}

beforeEach(() => {
	setSecret(SECRET);
	vi.stubEnv("ENTRY_PROXY_RANGES", ENTRY_RANGES);
});
afterEach(() => {
	setSecret(undefined);
	vi.unstubAllEnvs();
});

describe("resolveClientAddress through the entry point", () => {
	it("AC-0009-01 through Cloudflare and the load balancer, takes the address Cloudflare stated", () => {
		expect(resolveClientAddress(throughCloudflare("203.0.113.7"))).toBe(
			"203.0.113.7",
		);
	});

	it("AC-0009-07 ignores X-Forwarded-For and X-Real-IP entries the browser added", () => {
		const headers = requestHeaders({
			peer: LOAD_BALANCER,
			forwardedFor: `198.51.100.66, 203.0.113.7, ${CLOUDFLARE_EDGE}`,
			connectingIp: "203.0.113.7",
			realIp: "198.51.100.66",
		});

		expect(resolveClientAddress(headers)).toBe("203.0.113.7");
	});

	it("AC-0009-08 when the load balancer was reached from outside Cloudflare, takes that address and ignores CF-Connecting-IP", () => {
		const headers = requestHeaders({
			peer: LOAD_BALANCER,
			forwardedFor: "203.0.113.98, 198.51.100.20",
			connectingIp: "203.0.113.99",
		});

		expect(resolveClientAddress(headers)).toBe("198.51.100.20");
	});

	it("AC-0009-10 rotating browser X-Forwarded-For values resolve to one address", () => {
		const resolved = new Set<string | null>();

		for (let i = 1; i <= 21; i++) {
			resolved.add(
				resolveClientAddress(
					requestHeaders({
						peer: LOAD_BALANCER,
						forwardedFor: `198.51.100.${i}, 203.0.113.7, ${CLOUDFLARE_EDGE}`,
						connectingIp: "203.0.113.7",
					}),
				),
			);
		}

		expect([...resolved]).toEqual(["203.0.113.7"]);
	});

	it("AC-0009-11 rotating CF-Connecting-IP values around Cloudflare resolve to the connecting address", () => {
		const resolved = new Set<string | null>();

		for (let i = 1; i <= 21; i++) {
			resolved.add(
				resolveClientAddress(
					requestHeaders({
						peer: LOAD_BALANCER,
						forwardedFor: "198.51.100.20",
						connectingIp: `203.0.113.${i}`,
					}),
				),
			);
		}

		expect([...resolved]).toEqual(["198.51.100.20"]);
	});

	it("AC-0009-13 keeps an IPv6 client address Cloudflare stated", () => {
		expect(resolveClientAddress(throughCloudflare("2001:db8::7"))).toBe(
			"2001:db8::7",
		);
	});

	it("AC-0009-13 recognizes an IPv6 Cloudflare edge", () => {
		const headers = throughCloudflare("203.0.113.7", {}, "2606:4700::1");

		expect(resolveClientAddress(headers)).toBe("203.0.113.7");
	});

	it("AC-0009-01 stores a Cloudflare-stated IPv4-mapped address in IPv4 form", () => {
		const headers = throughCloudflare("203.0.113.7", {
			connectingIp: "::ffff:203.0.113.7",
		});

		expect(resolveClientAddress(headers)).toBe("203.0.113.7");
	});

	it("takes the load balancer's connecting address in IPv4 form when it arrives IPv4-mapped", () => {
		const headers = requestHeaders({
			peer: LOAD_BALANCER,
			forwardedFor: "::ffff:198.51.100.20",
		});

		expect(resolveClientAddress(headers)).toBe("198.51.100.20");
	});

	it("falls back to the peer when X-Forwarded-For is missing (Q7)", () => {
		const headers = requestHeaders({
			peer: LOAD_BALANCER,
			connectingIp: "203.0.113.7",
		});

		expect(resolveClientAddress(headers)).toBe(LOAD_BALANCER);
	});

	it("falls back to the peer when the last X-Forwarded-For entry is malformed (Q7)", () => {
		const headers = requestHeaders({
			peer: LOAD_BALANCER,
			forwardedFor: "203.0.113.7, not-an-address",
			connectingIp: "203.0.113.7",
		});

		expect(resolveClientAddress(headers)).toBe(LOAD_BALANCER);
	});

	it("falls back to the peer when CF-Connecting-IP is malformed (Q7)", () => {
		const headers = throughCloudflare("203.0.113.7", {
			connectingIp: "not-an-address",
		});

		expect(resolveClientAddress(headers)).toBe(LOAD_BALANCER);
	});

	it("falls back to the peer when CF-Connecting-IP is missing behind Cloudflare (Q7)", () => {
		const headers = requestHeaders({
			peer: LOAD_BALANCER,
			forwardedFor: `203.0.113.7, ${CLOUDFLARE_EDGE}`,
		});

		expect(resolveClientAddress(headers)).toBe(LOAD_BALANCER);
	});
});

describe("resolveClientAddress without the entry point", () => {
	it("AC-0009-14 with no entry point configured, takes the connecting address in IPv4 form", () => {
		vi.stubEnv("ENTRY_PROXY_RANGES", "");

		expect(
			resolveClientAddress(requestHeaders({ peer: "::ffff:127.0.0.1" })),
		).toBe("127.0.0.1");
	});

	it("AC-0009-14 with no entry point configured, ignores every forwarding header", () => {
		vi.stubEnv("ENTRY_PROXY_RANGES", "");

		expect(
			resolveClientAddress(
				throughCloudflare("203.0.113.7", { peer: "127.0.0.1" }),
			),
		).toBe("127.0.0.1");
	});

	it("AC-0009-14 keeps an IPv6 connecting address as it arrives", () => {
		vi.stubEnv("ENTRY_PROXY_RANGES", "");

		expect(resolveClientAddress(requestHeaders({ peer: "::1" }))).toBe("::1");
	});

	it("AC-0009-17 a direct connection to the web app with forged chain headers resolves to the connecting address", () => {
		const headers = requestHeaders({
			peer: "198.51.100.40",
			forwardedFor: `203.0.113.97, ${CLOUDFLARE_EDGE}`,
			connectingIp: "203.0.113.97",
		});

		expect(resolveClientAddress(headers)).toBe("198.51.100.40");
	});
});

describe("resolveClientAddress fails closed", () => {
	it("answers no address without a peer header", () => {
		const headers = requestHeaders({
			forwardedFor: `203.0.113.7, ${CLOUDFLARE_EDGE}`,
			connectingIp: "203.0.113.7",
		});

		expect(resolveClientAddress(headers)).toBeNull();
	});

	it("AC-0009-17 ignores a peer header the capture did not write", () => {
		// no secret in the process: the header came from the browser
		setSecret(undefined);
		expect(
			resolveClientAddress(
				requestHeaders({ peer: "198.51.100.40", secret: SECRET }),
			),
		).toBeNull();

		// a secret that does not match, of a different length
		setSecret(SECRET);
		expect(
			resolveClientAddress(
				requestHeaders({ peer: "198.51.100.40", secret: "short" }),
			),
		).toBeNull();
	});

	it("AC-0009-17 ignores a peer header carrying another secret of the same length", () => {
		const headers = requestHeaders({
			peer: "198.51.100.40",
			secret: "x".repeat(SECRET.length),
		});

		expect(resolveClientAddress(headers)).toBeNull();
	});

	it("answers no address when the peer is not an IP address", () => {
		expect(
			resolveClientAddress(requestHeaders({ peer: "not-an-address" })),
		).toBeNull();
	});

	it("never trusts X-Forwarded-For or CF-Connecting-IP alone", () => {
		setSecret(undefined);

		expect(resolveClientAddress(throughCloudflare("203.0.113.7"))).toBeNull();
	});
});

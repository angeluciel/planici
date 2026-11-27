import { timingSafeEqual } from "node:crypto";
import { BlockList, isIP } from "node:net";
import { CLOUDFLARE_RANGES } from "./cloudflare-ranges";
import { PEER_HEADER, PEER_SECRET_KEY } from "./peer-address";

// SPEC-0009 P-3: the client address of a browser request.
//  1. The peer is the socket address peer-address.ts wrote, believed only with
//     this process's secret. Without it there is no address (fail closed).
//  2. A peer outside ENTRY_PROXY_RANGES is the client (R10).
//  3. Otherwise the entry point appended the address that connected to it as
//     the last X-Forwarded-For entry (R3).
//  4. When that address is Cloudflare's, the client is CF-Connecting-IP (R2).
// Anything malformed falls back to the peer (Q7). X-Real-IP is never read.

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

function normalize(value: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? "";
	const address = IPV4_MAPPED.exec(trimmed)?.[1] ?? trimmed;

	return isIP(address) === 0 ? null : address;
}

function family(address: string): "ipv4" | "ipv6" {
	return isIP(address) === 6 ? "ipv6" : "ipv4";
}

// Entries that are not an address or CIDR are skipped, so a typo never
// throws; it only leaves that range untrusted.
function blockListOf(ranges: readonly string[]): BlockList {
	const list = new BlockList();

	for (const range of ranges) {
		const [rawAddress, rawPrefix] = range.trim().split("/");
		const address = normalize(rawAddress);
		if (!address) continue;

		try {
			if (rawPrefix === undefined) {
				list.addAddress(address, family(address));
			} else if (/^\d{1,3}$/.test(rawPrefix)) {
				list.addSubnet(address, Number(rawPrefix), family(address));
			}
		} catch {
			// prefix out of range for the family
		}
	}

	return list;
}

const cloudflare = blockListOf(CLOUDFLARE_RANGES);

let entryRanges: { raw: string; list: BlockList } | undefined;

function entryPoint(): BlockList {
	const raw = process.env.ENTRY_PROXY_RANGES ?? "";

	if (entryRanges?.raw !== raw) {
		entryRanges = { raw, list: blockListOf(raw.split(",")) };
	}

	return entryRanges.list;
}

function within(list: BlockList, address: string): boolean {
	return list.check(address, family(address));
}

function peerOf(headers: Headers): string | null {
	const secret = (globalThis as Record<symbol, unknown>)[PEER_SECRET_KEY];
	const value = headers.get(PEER_HEADER);
	if (typeof secret !== "string" || !value) return null;

	const space = value.indexOf(" ");
	if (space < 0) return null;

	const given = Buffer.from(value.slice(0, space));
	const expected = Buffer.from(secret);
	// timingSafeEqual throws on different lengths
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
		return null;
	}

	return normalize(value.slice(space + 1));
}

export function resolveClientAddress(headers: Headers): string | null {
	const peer = peerOf(headers);
	if (!peer) return null;
	if (!within(entryPoint(), peer)) return peer;

	const hop = normalize(headers.get("x-forwarded-for")?.split(",").at(-1));
	if (!hop) return peer;
	if (!within(cloudflare, hop)) return hop;

	return normalize(headers.get("cf-connecting-ip")) ?? peer;
}

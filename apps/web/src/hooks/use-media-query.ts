"use client";

import { useCallback, useSyncExternalStore } from "react";

// Wide screens show the field settings beside the card; narrow ones use a
// sheet (SPEC-0002 Q15: RNF-16's `lg` breakpoint).
export const WIDE_SCREEN_QUERY = "(min-width: 1024px)";

function hasMatchMedia(): boolean {
	return (
		typeof window !== "undefined" && typeof window.matchMedia === "function"
	);
}

// Whether `query` matches. Without `matchMedia` (server render, jsdom) it
// reports `fallback`.
export function useMediaQuery(query: string, fallback: boolean): boolean {
	const subscribe = useCallback(
		(onChange: () => void) => {
			if (!hasMatchMedia()) return () => undefined;
			const list = window.matchMedia(query);
			list.addEventListener("change", onChange);
			return () => list.removeEventListener("change", onChange);
		},
		[query],
	);
	return useSyncExternalStore(
		subscribe,
		() => (hasMatchMedia() ? window.matchMedia(query).matches : fallback),
		() => fallback,
	);
}

export function useWideScreen(): boolean {
	return useMediaQuery(WIDE_SCREEN_QUERY, true);
}

// The app shell's header and navigation switch at RNF-16's `md` (SPEC-0008
// R6). It is in rem, like Tailwind's `md` that the wide sidebar's CSS uses, so
// both switch together at any default font size.
export const NAV_WIDE_QUERY = "(min-width: 48rem)";

export function useWideNav(): boolean {
	return useMediaQuery(NAV_WIDE_QUERY, true);
}

"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Layout = "wide" | "narrow";

// 48rem at the 16px root; the harness and useMediaQuery read px.
const WIDE_QUERY = "(min-width: 768px)";

const hasMatchMedia = () =>
	typeof window !== "undefined" && typeof window.matchMedia === "function";

// The list's layout (SPEC-0006 G-2). The server snapshot is `null`, so the
// server render and the hydration render know no layout; the client snapshot
// is "wide" or "narrow", and "wide" without `matchMedia` (jsdom).
export function useLayout(): Layout | null {
	const subscribe = useCallback((onChange: () => void) => {
		if (!hasMatchMedia()) return () => undefined;
		const list = window.matchMedia(WIDE_QUERY);
		list.addEventListener("change", onChange);
		return () => list.removeEventListener("change", onChange);
	}, []);
	return useSyncExternalStore<Layout | null>(
		subscribe,
		() =>
			!hasMatchMedia() || window.matchMedia(WIDE_QUERY).matches
				? "wide"
				: "narrow",
		() => null,
	);
}

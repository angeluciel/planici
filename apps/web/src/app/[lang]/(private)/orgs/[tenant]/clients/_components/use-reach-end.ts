"use client";

import { useCallback, useRef } from "react";

// A ref callback for the last loaded row or card. It calls `loadNext` when the
// element comes into view (G-9, `rootMargin: "0px"`) and on focus within it
// (AC-0006-44).
export function useReachEnd(loadNext: () => void) {
	const latest = useRef(loadNext);
	latest.current = loadNext;

	return useCallback((element: HTMLElement | null) => {
		if (!element) return;
		const trigger = () => latest.current();
		const observer =
			typeof IntersectionObserver === "function"
				? new IntersectionObserver(
						(entries) => {
							if (entries.some((entry) => entry.isIntersecting)) trigger();
						},
						{ rootMargin: "0px" },
					)
				: null;
		observer?.observe(element);
		element.addEventListener("focusin", trigger);
		return () => {
			observer?.disconnect();
			element.removeEventListener("focusin", trigger);
		};
	}, []);
}

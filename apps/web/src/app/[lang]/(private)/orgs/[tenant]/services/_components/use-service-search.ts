"use client";

import { SERVICE_SEARCH_MIN_LENGTH } from "@planici/schemas";
import { useEffect, useState } from "react";

const DEBOUNCE_MS = 300;

const length = (text: string) => [...text].length;

// The search box of the list (R9): the typed text, the debounced and trimmed
// query (none under 2 characters) and whether the box holds a too short one.
export function useServiceSearch() {
	const [input, setInput] = useState("");
	const [debounced, setDebounced] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [input]);

	const trimmed = debounced.trim();
	const q = length(trimmed) >= SERVICE_SEARCH_MIN_LENGTH ? trimmed : undefined;
	const typed = length(input.trim());

	return {
		input,
		setInput,
		q,
		shortInput: typed > 0 && typed < SERVICE_SEARCH_MIN_LENGTH,
	};
}

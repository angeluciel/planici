"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { THEME_STORAGE_KEY } from "@/lib/consent";
import { useConsent } from "./consent-provider";

/**
 *  Keeps theme persistence honest
 *
 *  next-themes always writes teh theme to local storage.
 * */

export function ThemeConsentSync() {
	const { grants } = useConsent();
	const { theme } = useTheme();

	useEffect(() => {
		if (grants.preferences) return;

		try {
			window.localStorage.removeItem(THEME_STORAGE_KEY);
		} catch {
			// whatever
		}
	}, [grants.preferences, theme]);

	return null;
}

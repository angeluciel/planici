"use client";

import { useEffect, useState } from "react";

export type SidebarMode = "hover" | "expanded" | "collapsed";
const STORAGE_KEY = "planici:sidebar-mode";

export function useSidebarMode() {
	const [mode, setMode] = useState<SidebarMode>("hover");

	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved === "hover" || saved === "expanded" || saved === "collapsed") {
				setMode(saved);
			}
		} catch {
			// nothing
		}
	}, []);

	function changeMode(next: SidebarMode) {
		setMode(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// nothing
		}
	}

	return { mode, changeMode };
}

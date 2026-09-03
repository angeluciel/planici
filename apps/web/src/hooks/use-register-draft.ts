"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_REGISTER_DATA, type RegisterData } from "@/types/register";

const DRAFT_KEY = "planici_register_draft";

/**
 * Fields that survive a reload. Passwords are excluded.
 * A user who reloads keeps their e-mail and profile fields, and is
 * redirected to the password step
 * */

type RegisterDraft = Omit<RegisterData, "password" | "confirmPassword">;

function readDraft(): RegisterDraft | null {
	try {
		const raw = window.sessionStorage.getItem(DRAFT_KEY);
		if (!raw) return null;

		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null) return null;

		return parsed as RegisterDraft;
	} catch {
		return null;
	}
}

/**
 *  Keeps the in-progress sign-up across reloads via `sessionStorage`
 * */

export function useRegisterDraft() {
	const [data, setData] = useState<RegisterData>(EMPTY_REGISTER_DATA);
	const [restored, setRestored] = useState(false);

	const dataRef = useRef(data);

	useEffect(() => {
		const draft = readDraft();

		if (draft) {
			const restoredData = { ...EMPTY_REGISTER_DATA, ...draft };
			dataRef.current = restoredData;
			setData(restoredData);
		}
		setRestored(true);
	}, []);

	const update = useCallback((values: Partial<RegisterData>) => {
		const next = { ...dataRef.current, ...values };
		dataRef.current = next;
		setData(next);

		const { password: _password, confirmPassword: _confirm, ...draft } = next;

		try {
			window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
		} catch {
			// whatever
		}
		return next;
	}, []);

	const clear = useCallback(() => {
		try {
			window.sessionStorage.removeItem(DRAFT_KEY);
		} catch {
			// whatever
		}
	}, []);

	return { data, update, clear, restored };
}

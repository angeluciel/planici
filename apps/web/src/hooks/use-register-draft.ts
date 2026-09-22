"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	restoreRegisterDraft,
	serializeRegisterDraft,
} from "@/lib/register-draft";
import { EMPTY_REGISTER_DATA, type RegisterData } from "@/types/register";

const DRAFT_KEY = "planici_register_draft";

/**
 * Fields that survive a reload. Passwords are excluded.
 * A user who reloads keeps their e-mail and profile fields, and is
 * redirected to the password step
 * */

export function useRegisterDraft() {
	const [data, setData] = useState<RegisterData>({ ...EMPTY_REGISTER_DATA });
	const [restored, setRestored] = useState(false);
	const dataRef = useRef(data);

	useEffect(() => {
		let raw: string | null = null;

		try {
			raw = window.sessionStorage.getItem(DRAFT_KEY);
		} catch {
			// whatever
		}

		const restoredData = restoreRegisterDraft(raw);
		dataRef.current = restoredData;
		setData(restoredData);

		try {
			window.sessionStorage.setItem(
				DRAFT_KEY,
				serializeRegisterDraft(restoredData),
			);
		} catch {
			// whatever
		}
		setRestored(true);
	}, []);

	const update = useCallback((values: Partial<RegisterData>) => {
		const next = { ...dataRef.current, ...values };
		dataRef.current = next;
		setData(next);

		try {
			window.sessionStorage.setItem(DRAFT_KEY, serializeRegisterDraft(next));
		} catch {
			// whatever
		}
		return next;
	}, []);

	const getData = useCallback(() => dataRef.current, []);

	const clear = useCallback(() => {
		try {
			window.sessionStorage.removeItem(DRAFT_KEY);
		} catch {
			// whatever
		}
		dataRef.current = { ...EMPTY_REGISTER_DATA };
		setData(dataRef.current);
	}, []);

	return { data, update, getData, clear, restored };
}

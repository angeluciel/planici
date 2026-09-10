"use client";

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import {
	ALLOW_ALL,
	CONSENT_COOKIE,
	CONSENT_MAX_AGE_SECONDS,
	type ConsentChoices,
	type ConsentRecord,
	createConsentRecord,
	DENY_ALL,
	grantsOf,
	serializeConsent,
} from "@/lib/consent";

type ConsentContextValue = {
	record: ConsentRecord | null;
	grants: ConsentChoices;
	hasChosen: boolean;
	acceptAll: () => Promise<void>;
	rejectAll: () => Promise<void>;
	save: (choices: ConsentChoices) => Promise<void>;
	openPreferences: () => void;
	closePreferences: () => void;
	preferencesOpen: boolean;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

async function writeConsentCookie(record: ConsentRecord) {
	await cookieStore.set({
		name: CONSENT_COOKIE,
		value: serializeConsent(record),
		path: "/",
		//TODO: upgrade ts and nextjs versions
		// @ts-expect-error maxAge is missing in this bitch ass version of ts
		maxAge: CONSENT_MAX_AGE_SECONDS,
		sameSite: "lax",
	});
}

export function ConsentProvider({
	initial,
	children,
}: Readonly<{ initial: ConsentRecord | null; children: React.ReactNode }>) {
	const [record, setRecord] = useState<ConsentRecord | null>(initial);
	const [preferencesOpen, setPreferencesOpen] = useState(false);

	const commit = useCallback(async (choices: ConsentChoices) => {
		const next = createConsentRecord(choices);
		await writeConsentCookie(next);
		setRecord(next);
		setPreferencesOpen(false);
	}, []);

	const value = useMemo<ConsentContextValue>(
		() => ({
			record,
			grants: grantsOf(record),
			hasChosen: record !== null,
			acceptAll: () => commit(ALLOW_ALL),
			rejectAll: () => commit(DENY_ALL),
			save: commit,
			openPreferences: () => setPreferencesOpen(true),
			closePreferences: () => setPreferencesOpen(false),
			preferencesOpen,
		}),
		[record, commit, preferencesOpen],
	);

	return (
		<ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
	);
}

export function useConsent(): ConsentContextValue {
	const context = useContext(ConsentContext);

	if (!context) {
		throw new Error("useConsent must be used within a ConsentProvider.");
	}

	return context;
}

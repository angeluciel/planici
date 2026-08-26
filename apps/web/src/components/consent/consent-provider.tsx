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
	acceptAll: () => void;
	rejectAll: () => void;
	save: (choices: ConsentChoices) => void;
	openPreferences: () => void;
	closePreferences: () => void;
	preferencesOpen: boolean;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function writeConsentCookie(record: ConsentRecord) {
	const secure = window.location.protocol === "https:" ? "; Secure" : "";

	const cookie =
		`${CONSENT_COOKIE}=${serializeConsent(record)}` +
		`; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;

	document.cookie = cookie;
}

export function ConsentProvider({
	initial,
	children,
}: Readonly<{ initial: ConsentRecord | null; children: React.ReactNode }>) {
	const [record, setRecord] = useState<ConsentRecord | null>(initial);
	const [preferencesOpen, setPreferencesOpen] = useState(false);

	const commit = useCallback((choices: ConsentChoices) => {
		const next = createConsentRecord(choices);
		writeConsentCookie(next);
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
	// biome-ignore lint: Sem problema chamar recursivamente
	const context = useContext(ConsentContext);

	if (!context) {
		throw new Error("useConsent must be used within a ConsentProvider.");
	}

	return context;
}

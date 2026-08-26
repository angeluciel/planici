export const CONSENT_COOKIE = "planici_consent";

export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const THEME_STORAGE_KEY = "theme";

export const OPTIONAL_CATEGORIES = ["preferences", "analytics"] as const;

export type OptionalCategory = (typeof OPTIONAL_CATEGORIES)[number];
export type ConsentCategory = "necessary" | OptionalCategory;

export type ConsentChoices = Record<OptionalCategory, boolean>;

export type ConsentRecord = {
	/** Schema version, matched against conset version */
	v: number;
	timestamp: string;
	categories: ConsentChoices;
};

export const DENY_ALL: ConsentChoices = {
	preferences: false,
	analytics: false,
};

export const ALLOW_ALL: ConsentChoices = {
	preferences: true,
	analytics: true,
};

/***/
export const COOKIE_INVENTORY: Record<
	ConsentCategory,
	ReadonlyArray<{ name: string; key: string }>
> = {
	necessary: [
		{ name: "token", key: "token" },
		{ name: "NEXT_LOCALE", key: "locale" },
		{ name: CONSENT_COOKIE, key: "consent" },
	],
	preferences: [{ name: "theme", key: "theme" }],
	analytics: [], // none yet :P
};

export function createConsentRecord(categories: ConsentChoices): ConsentRecord {
	return {
		v: CONSENT_VERSION,
		timestamp: new Date().toISOString(),
		categories,
	};
}

export function parseConsent(raw: string | undefined): ConsentRecord | null {
	if (!raw) return null;

	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(raw));

		if (typeof parsed !== "object" || parsed === null) return null;

		const record = parsed as Partial<ConsentRecord>;
		if (record.v !== CONSENT_VERSION) return null;
		if (typeof record.timestamp !== "string") return null;
		if (typeof record.categories !== "object" || record.categories === null) {
			return null;
		}

		const categories = record.categories as Partial<ConsentChoices>;

		return {
			v: CONSENT_VERSION,
			timestamp: record.timestamp,
			categories: {
				preferences: categories.preferences === true,
				analytics: categories.analytics === true,
			},
		};
	} catch {
		return null;
	}
}

export function serializeConsent(record: ConsentRecord): string {
	return encodeURIComponent(JSON.stringify(record));
}

export function grantsOf(record: ConsentRecord | null): ConsentChoices {
	return record?.categories ?? DENY_ALL;
}

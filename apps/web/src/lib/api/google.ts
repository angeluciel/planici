"use client";

/**
 * Google Identity Services (GIS) wrapper.
 *
 * Kept separate from `lib/api/login.ts` because both the login form and the
 * register flow need an id token, and neither should own the script loading.
 *
 * Everything here degrades instead of throwing: with no client ID configured
 * the caller gets `{ ok: false, error: "google.unavailable" }` and can disable
 * its button, which is what you want while the OAuth client is unprovisioned.
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Safe to read during render — it is a build-time inlined env var. */
export const isGoogleConfigured = GOOGLE_CLIENT_ID.length > 0;

export type GoogleIdTokenResult =
	| { ok: true; idToken: string }
	| { ok: false; error: string };

interface GoogleCredentialResponse {
	credential?: string;
}

interface GooglePromptNotification {
	isSkippedMoment(): boolean;
	isDismissedMoment(): boolean;
}

interface GoogleAccountsId {
	initialize(config: {
		client_id: string;
		callback: (response: GoogleCredentialResponse) => void;
		cancel_on_tap_outside?: boolean;
		auto_select?: boolean;
	}): void;
	prompt(listener?: (notification: GooglePromptNotification) => void): void;
}

declare global {
	interface Window {
		google?: { accounts: { id: GoogleAccountsId } };
	}
}

let gsiScript: Promise<void> | null = null;

function loadGsi(): Promise<void> {
	if (typeof window === "undefined") {
		return Promise.reject(new Error("gsi: not available on the server"));
	}

	if (window.google?.accounts.id) return Promise.resolve();

	// Memoised so two buttons on one page don't inject two script tags.
	gsiScript ??= new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = GSI_SRC;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => {
			gsiScript = null; // let a later attempt retry
			reject(new Error("gsi: failed to load"));
		};
		document.head.appendChild(script);
	});

	return gsiScript;
}

/**
 * Opens the Google account chooser and resolves with the id token.
 *
 * TODO: `prompt()` is the One Tap path and browsers increasingly gate it behind
 * FedCM and third-party-cookie rules. Once the OAuth client exists, prefer
 * `google.accounts.id.renderButton()` into a real container element — it is the
 * supported path and does not get silently suppressed.
 */
export async function requestGoogleIdToken(): Promise<GoogleIdTokenResult> {
	if (!isGoogleConfigured) return { ok: false, error: "google.unavailable" };

	try {
		await loadGsi();
	} catch {
		return { ok: false, error: "google.unavailable" };
	}

	const accounts = window.google?.accounts.id;
	if (!accounts) return { ok: false, error: "google.unavailable" };

	return new Promise<GoogleIdTokenResult>((resolve) => {
		accounts.initialize({
			client_id: GOOGLE_CLIENT_ID,
			cancel_on_tap_outside: true,
			callback: ({ credential }) => {
				resolve(
					credential
						? { ok: true, idToken: credential }
						: { ok: false, error: "google.cancelled" },
				);
			},
		});

		accounts.prompt((notification) => {
			if (notification.isSkippedMoment() || notification.isDismissedMoment()) {
				resolve({ ok: false, error: "google.cancelled" });
			}
		});
	});
}

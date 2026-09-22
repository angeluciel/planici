"use client";

const GSI_SRC = "https://accounts.google.com/gsi/client";
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const isGoogleConfigured = GOOGLE_CLIENT_ID.length > 0;
export type GoogleIdTokenResult =
	| { ok: true; idToken: string }
	| { ok: false; error: string };

interface GooglePromptNotification {
	isSkippedMoment(): boolean;
	isDismissedMoment(): boolean;
}
interface GoogleAccountsId {
	initialize(config: {
		client_id: string;
		callback: (response: { credential?: string }) => void;
		auto_select?: boolean;
		cancel_on_tap_outside?: boolean;
	}): void;
	prompt(listener?: (notification: GooglePromptNotification) => void): void;
	renderButton(
		parent: HTMLElement,
		options: {
			type: "standard";
			theme: "outline";
			size: "large";
			text: "signup_with";
			shape: "rectangular";
			width: number;
			locale: string;
		},
	): void;
}

declare global {
	interface Window {
		google?: { accounts: { id: GoogleAccountsId } };
	}
}

let gsiScript: Promise<void> | null = null;
let initialized: GoogleAccountsId | null = null;
let credentialHandler: ((result: GoogleIdTokenResult) => void) | null = null;

function loadGsi(): Promise<void> {
	if (typeof window === "undefined") {
		return Promise.reject(new Error("gsi: not available on the server"));
	}

	if (window.google?.accounts.id) return Promise.resolve();

	if (gsiScript) return gsiScript;

	gsiScript = new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		const timeout = setTimeout(failed, 10_000);
		function failed() {
			clearTimeout(timeout);
			script.remove();
			gsiScript = null;
			reject(new Error("Google script unavailable"));
		}

		script.src = GSI_SRC;
		script.async = true;
		script.defer = true;
		script.onload = () => {
			clearTimeout(timeout);
			if (window.google?.accounts.id) resolve();
			else failed();
		};
		script.onerror = failed;
		document.head.appendChild(script);
	});

	return gsiScript;
}

async function accounts(): Promise<GoogleAccountsId> {
	if (!isGoogleConfigured) throw new Error("Google client ID missing");
	await loadGsi();
	const client = window.google?.accounts.id;
	if (!client) throw new Error("Google unavailable");
	if (initialized !== client) {
		client.initialize({
			client_id: GOOGLE_CLIENT_ID,
			auto_select: false,
			cancel_on_tap_outside: true,
			callback: ({ credential }) =>
				credentialHandler?.(
					credential
						? { ok: true, idToken: credential }
						: { ok: false, error: "google.invalid" },
				),
		});
		initialized = client;
	}
	return client;
}

function receive(handler: (result: GoogleIdTokenResult) => void): () => void {
	credentialHandler = handler;
	return () => {
		if (credentialHandler === handler) credentialHandler = null;
	};
}

export async function renderGoogleSignUpButton(
	element: HTMLElement,
	locale: string,
	handler: (result: GoogleIdTokenResult) => void,
): Promise<() => void> {
	const client = await accounts();
	if (!element.isConnected)
		return () => {
			// empty
		};
	const unsubscribe = receive(handler);
	try {
		client.renderButton(element, {
			type: "standard",
			theme: "outline",
			size: "large",
			text: "signup_with",
			shape: "rectangular",
			width: 320,
			locale,
		});
	} catch (error) {
		unsubscribe();
		throw error;
	}
	return () => {
		if (credentialHandler === handler) {
			unsubscribe();
			element.replaceChildren();
		}
	};
}

export async function requestGoogleIdToken(): Promise<GoogleIdTokenResult> {
	let client: GoogleAccountsId;

	try {
		client = await accounts();
	} catch {
		return { ok: false, error: "google.unavailable" };
	}
	return new Promise((resolve) => {
		let finished = false;
		let unsubscribe = () => {
			// wait
		};
		const timeout = setTimeout(
			() => finish({ ok: false, error: "google.unavailable" }),
			60_000,
		);
		function finish(result: GoogleIdTokenResult) {
			if (finished) return;
			finished = true;
			clearTimeout(timeout);
			unsubscribe();
			resolve(result);
		}

		unsubscribe = receive(finish);

		try {
			client.prompt((notification) => {
				if (
					notification.isSkippedMoment() ||
					notification.isDismissedMoment()
				) {
					finish({ ok: false, error: "google.cancelled" });
				}
			});
		} catch {
			finish({ ok: false, error: "google.unavailable" });
		}
	});
}

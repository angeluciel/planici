"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

// Leave prompt for dirty forms (SPEC-0001 AC-0001-18; shared with SPEC-0003).
//
// The App Router has no navigation-blocking API, so while `dirty`:
//  - clicks on same-origin links are intercepted (capture phase, before the
//    router's own handler) and the leave dialog is shown;
//  - `beforeunload` covers tab close and reload (browser's own prompt);
//  - back and forward are covered by a guard history entry kept on top of the
//    stack. Going back lands on the entry under it (same URL) and fires
//    `popstate`; "stay" pushes the guard entry again, "leave" goes back once
//    more, past the page.
// After a save the guard entry stays on top until the page leaves: links and
// `navigate` then replace it instead of pushing on top of it, and back skips it.
//
// The caller renders the dialog (see forms/_components/leave-dialog.tsx) from
// `open`, `message`, `stay` and `leave`, so this file stays free of markup.

type Pending = { kind: "link" | "popstate" | "manual"; run: () => void };

export type LeaveGuard = {
	open: boolean;
	message: string;
	// closes the dialog and keeps the page (restores the guard entry for back/forward)
	stay: () => void;
	// closes the dialog and goes where the user was going
	leave: () => void;
	// runs `action` now when the form is clean, otherwise after the user confirms
	requestLeave: (action: () => void) => void;
	// Programmatic navigation that does not strand the guard entry: `go` gets
	// "replace" while the guard entry is on top (it takes that entry's place),
	// "push" otherwise. Use it for every navigation the page starts itself.
	navigate: (go: (mode: "push" | "replace") => void) => void;
};

export function useLeaveGuard({
	dirty,
	messageKey,
}: Readonly<{ dirty: boolean; messageKey: string }>): LeaveGuard {
	const t = useTranslations();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const pending = useRef<Pending | null>(null);
	const guardActive = useRef(false);
	// true once we deliberately go back past the guard: popstate is not ours to handle
	const leaving = useRef(false);
	const dirtyRef = useRef(dirty);

	useEffect(() => {
		dirtyRef.current = dirty;
	}, [dirty]);

	const pushGuard = useCallback(() => {
		window.history.pushState(window.history.state, "", window.location.href);
		guardActive.current = true;
	}, []);

	const navigate = useCallback((go: (mode: "push" | "replace") => void) => {
		const mode = guardActive.current ? "replace" : "push";
		guardActive.current = false;
		go(mode);
	}, []);

	// back and forward: always listening, because the guard entry can outlive
	// the dirty state (saved after editing)
	useEffect(() => {
		const onPopState = () => {
			if (leaving.current || !guardActive.current) return;
			guardActive.current = false;

			if (!dirtyRef.current) {
				// the form was saved: skip the leftover guard entry
				leaving.current = true;
				window.history.back();
				return;
			}

			pending.current = {
				kind: "popstate",
				run: () => {
					leaving.current = true;
					window.history.back();
				},
			};
			setOpen(true);
		};

		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	useEffect(() => {
		if (!dirty) return;

		if (!guardActive.current) pushGuard();

		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};

		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [dirty, pushGuard]);

	// in-app links: always listening, like popstate, because the guard entry can
	// outlive the dirty state. Dirty: ask first. Saved but the guard entry is
	// still on top: go without asking, taking that entry's place.
	// An intercepted click stops in the capture phase, so the link's own onClick
	// (e.g. the sidebar closing its drawer) and <Link> props such as `replace` or
	// `scroll` do not run. Code that must react to leaving should watch the
	// pathname, as the org shell does, not the link's click.
	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			if (!dirtyRef.current && !guardActive.current) return;

			const href = inAppLinkTarget(event);
			if (!href) return;

			event.preventDefault();
			event.stopPropagation();
			const go = () => navigate((mode) => router[mode](href));

			if (!dirtyRef.current) {
				go();
				return;
			}

			pending.current = { kind: "link", run: go };
			setOpen(true);
		};

		document.addEventListener("click", onClick, true);
		return () => document.removeEventListener("click", onClick, true);
	}, [router, navigate]);

	const stay = useCallback(() => {
		const current = pending.current;
		pending.current = null;
		setOpen(false);
		if (current?.kind === "popstate") pushGuard();
	}, [pushGuard]);

	const leave = useCallback(() => {
		const current = pending.current;
		pending.current = null;
		setOpen(false);
		current?.run();
	}, []);

	const requestLeave = useCallback((action: () => void) => {
		if (!dirtyRef.current) {
			action();
			return;
		}
		pending.current = { kind: "manual", run: action };
		setOpen(true);
	}, []);

	return { open, message: t(messageKey), stay, leave, requestLeave, navigate };
}

// Target of a plain left click on a same-origin link to another page, or null
// when the click is not ours to handle (modifiers, new tab, download, same page).
function inAppLinkTarget(event: MouseEvent): string | null {
	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	) {
		return null;
	}

	const target = event.target instanceof Element ? event.target : null;
	const anchor = target?.closest<HTMLAnchorElement>("a[href]");
	if (!anchor) return null;
	if (anchor.target && anchor.target !== "_self") return null;
	if (anchor.hasAttribute("download")) return null;

	const url = new URL(anchor.href, window.location.href);
	if (url.origin !== window.location.origin) return null;
	if (
		url.pathname === window.location.pathname &&
		url.search === window.location.search
	) {
		return null;
	}

	return `${url.pathname}${url.search}${url.hash}`;
}

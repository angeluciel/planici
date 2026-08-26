"use client";

import { useConsent } from "./consent-provider";

/**
 *  Link to telemetry collection.
 * */

export function AlayticsGate({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const { grants } = useConsent();

	if (!grants.analytics) return null;

	return <>{children}</>;
}

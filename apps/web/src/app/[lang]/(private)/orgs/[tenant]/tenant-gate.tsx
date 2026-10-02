"use client";

import { notFound } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { Alert } from "@/components/alert";
import { usePathname, useRouter } from "@/i18n/navigation";
import { selectTenant } from "@/lib/api/tenants";
import { useFieldError } from "@/lib/form";

const MISSING = new Set([
	"tenant.not-found",
	"tenant.inactive",
	"tenant.forbidden",
	"tenant.required",
]);
const SIGNED_OUT = new Set([
	"session.expired",
	"token.invalid",
	"token.expired",
]);

type GateState = "loading" | "ready" | "missing" | { error: string };

/**
 * Makes the tenant in the URL the active one (cookie read by /api routes as
 * X-Tenant-Id) before rendering anything that fetches tenant data.
 */
export function TenantGate({
	tenantId,
	children,
}: Readonly<{ tenantId: string; children: React.ReactNode }>) {
	const [state, setState] = useState<GateState>("loading");
	const router = useRouter();
	const pathname = usePathname();
	const fieldError = useFieldError();

	const toLogin = useEffectEvent(() => {
		router.replace({ pathname: "/login", query: { next: pathname } });
	});

	useEffect(() => {
		let cancelled = false;
		setState("loading");

		selectTenant(tenantId).then((result) => {
			if (cancelled) return;

			if (result.ok) setState("ready");
			else if (MISSING.has(result.error)) setState("missing");
			else if (SIGNED_OUT.has(result.error)) toLogin();
			else setState({ error: result.error });
		});

		return () => {
			cancelled = true;
		};
	}, [tenantId]);

	if (state === "missing") notFound();
	if (state === "ready") return children;
	if (state === "loading") return null;

	return (
		<div className="p-4">
			<Alert tone="danger">{fieldError(state.error)}</Alert>
		</div>
	);
}

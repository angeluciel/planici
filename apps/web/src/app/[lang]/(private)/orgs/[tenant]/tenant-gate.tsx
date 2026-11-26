"use client";

import type { Tenant } from "@planici/schemas";
import { notFound } from "next/navigation";
import { createContext, use, useEffect, useEffectEvent, useState } from "react";
import { Alert } from "@/components/ui/alert";
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

type GateState = "loading" | "missing" | { tenant: Tenant } | { error: string };

// The organization the gate selected for the page (SPEC-0008: the header
// names it).
const ActiveTenantContext = createContext<Tenant | null>(null);

export function useActiveTenant(): Tenant {
	const tenant = use(ActiveTenantContext);
	if (!tenant)
		throw new Error("useActiveTenant must be used inside TenantGate");
	return tenant;
}

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

		selectTenant(tenantId)
			.then((result) => {
				if (cancelled) return;

				if (result.ok) setState({ tenant: result.tenant });
				else if (MISSING.has(result.error)) setState("missing");
				else if (SIGNED_OUT.has(result.error)) toLogin();
				else setState({ error: result.error });
			})
			.catch(() => {
				if (cancelled) return;
				setState({ error: "network.unavailable" });
			});

		return () => {
			cancelled = true;
		};
	}, [tenantId]);

	if (state === "missing") notFound();
	if (state === "loading") return null;
	if ("tenant" in state)
		return (
			<ActiveTenantContext value={state.tenant}>{children}</ActiveTenantContext>
		);

	return (
		<div className="p-4">
			<Alert tone="danger">{fieldError(state.error)}</Alert>
		</div>
	);
}

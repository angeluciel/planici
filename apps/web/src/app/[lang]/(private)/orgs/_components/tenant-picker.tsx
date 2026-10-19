"use client";

import type { Tenant } from "@planici/schemas";
import { ArrowRightIcon, Building2Icon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { listTenants, selectTenant } from "@/lib/api/tenants";
import { useFieldError } from "@/lib/form";

export function TenantPicker() {
	const t = useTranslations("tenants.list");
	const router = useRouter();
	const fieldError = useFieldError();
	const [tenants, setTenants] = useState<Tenant[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);
	const selecting = useRef(false);
	const mounted = useRef(false);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	function handleFailure(message: string) {
		if (
			["session.expired", "token.invalid", "token.expired"].includes(message)
		) {
			router.replace({ pathname: "/login", query: { next: "/orgs" } });
		} else {
			setError(message);
		}
	}

	const onLoadFailure = useEffectEvent(handleFailure);

	// biome-ignore lint/correctness/useExhaustiveDependencies: The retry counter intentionally starts a new request.
	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		listTenants()
			.then((result) => {
				if (cancelled) return;
				if (result.ok) setTenants(result.tenants);
				else onLoadFailure(result.error);
			})
			.catch(() => {
				if (!cancelled) onLoadFailure("unexpected");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [attempt]);

	async function openTenant(tenant: Tenant) {
		if (selecting.current || tenant.status !== "active") return;
		selecting.current = true;
		setPendingId(tenant.id);
		setError(null);

		try {
			// The server verifies membership and status before setting the httpOnly cookie.
			const result = await selectTenant(tenant.id);
			if (!mounted.current) return;
			if (result.ok) {
				router.push(`/orgs/${result.tenant.id}/clients`);
				router.refresh();
				return;
			}
			handleFailure(result.error);
		} catch {
			if (!mounted.current) return;
			handleFailure("unexpected");
		}

		selecting.current = false;
		setPendingId(null);
	}

	return (
		<main className="min-h-dvh bg-surface px-4 py-8 text-text-primary sm:px-8">
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
				<Logo className="h-8 w-auto self-start" />
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col gap-2">
						<h1 className="font-heading-lg">{t("title")}</h1>
						<p className="font-body-md text-text-secondary">
							{t("description")}
						</p>
					</div>
					<Link
						href="/create-tenant"
						className="flex min-h-10 items-center gap-2 rounded-md bg-background-brand-bold px-4 py-2 font-body-sm text-text-inverse hover:bg-background-brand-bold-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
					>
						<PlusIcon aria-hidden="true" className="size-4" />
						{t("create")}
					</Link>
				</header>

				{error && (
					<div className="flex flex-col items-start gap-3">
						<Alert tone="danger">{fieldError(error)}</Alert>
						<Button
							variant="subtle"
							text={t("retry")}
							onClick={() => setAttempt((value) => value + 1)}
							disabled={pendingId !== null}
							className="w-auto px-4"
						/>
					</div>
				)}

				{loading ? (
					<output className="py-8 font-body-md">{t("loading")}</output>
				) : tenants.length === 0 ? (
					!error && (
						<section className="flex flex-col items-center gap-3 rounded-lg border border-border px-6 py-12 text-center">
							<Building2Icon
								aria-hidden="true"
								className="size-10 text-icon-subtle"
							/>
							<h2 className="font-heading-sm">{t("emptyTitle")}</h2>
							<p className="font-body-md text-text-secondary">
								{t("emptyDescription")}
							</p>
						</section>
					)
				) : (
					<ul aria-label={t("title")} className="grid gap-4 sm:grid-cols-2">
						{tenants.map((tenant) => (
							<li
								key={tenant.id}
								className="flex min-w-0 flex-col gap-5 rounded-lg border border-border bg-surface-overlay p-5 shadow-overlay"
							>
								<div className="flex items-start gap-3">
									<Building2Icon
										aria-hidden="true"
										className="mt-1 size-6 shrink-0 text-icon"
									/>
									<div className="min-w-0 flex-1">
										<h2 className="break-words font-heading-sm">
											{tenant.name}
										</h2>
										<p className="break-all font-body-sm text-text-secondary">
											{tenant.slug}
										</p>
									</div>
								</div>
								<div className="flex flex-wrap items-center justify-between gap-2 font-body-sm text-text-secondary">
									<span>{t(`plans.${tenant.plan}`)}</span>
									<span>{t(`statuses.${tenant.status}`)}</span>
								</div>
								<Button
									variant="subtle"
									text={t(pendingId === tenant.id ? "opening" : "open")}
									trailingIcon={ArrowRightIcon}
									aria-label={t("openWorkspace", { name: tenant.name })}
									aria-busy={pendingId === tenant.id}
									disabled={pendingId !== null || tenant.status !== "active"}
									onClick={() => void openTenant(tenant)}
									className="mt-auto disabled:cursor-not-allowed disabled:opacity-50"
								/>
							</li>
						))}
					</ul>
				)}
			</div>
		</main>
	);
}

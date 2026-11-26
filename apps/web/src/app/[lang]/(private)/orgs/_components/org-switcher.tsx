"use client";

import { Menu } from "@base-ui/react/menu";
import type { Tenant } from "@planici/schemas";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { isSignedOut } from "@/lib/api/signed-out";
import { listTenants, selectTenant } from "@/lib/api/tenants";
import { useFieldError } from "@/lib/form";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "../[tenant]/tenant-gate";

/** The first character of the trimmed name, upper-cased for `locale` (AC-0008-04). */
export function initialOf(name: string, locale: string): string {
	const [first = ""] = name.trim();
	return first.toLocaleUpperCase(locale);
}

/** The error key's message, or the generic one when it has none. */
export function useErrorMessage() {
	const fieldError = useFieldError();
	return (error: string) => fieldError(error) ?? fieldError("unexpected") ?? "";
}

function Initial({
	name,
	className,
}: Readonly<{ name: string; className?: string }>) {
	const locale = useLocale();
	return (
		<span
			aria-hidden="true"
			className={cn(
				"flex shrink-0 items-center justify-center rounded-sm bg-background-brand-bold font-semibold text-text-inverse",
				className,
			)}
		>
			{initialOf(name, locale)}
		</span>
	);
}

const ITEM =
	"flex min-h-9 cursor-pointer items-center gap-2 px-3 py-2 font-body-sm text-text-primary outline-none data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-highlighted:bg-surface-hovered";

// The open organization in the header (SPEC-0008 §4.2): its initial and name
// lead to the organization list; the chevrons open a menu to switch.
export function OrgSwitcher() {
	const t = useTranslations();
	const active = useActiveTenant();
	const router = useRouter();
	const pathname = usePathname();
	const toast = useToast();
	const message = useErrorMessage();
	const [open, setOpen] = useState(false);
	const [switching, setSwitching] = useState(false);

	const toSignIn = () =>
		router.replace({ pathname: "/login", query: { next: pathname } });

	async function choose(id: string) {
		if (switching || id === active.id) return;
		setSwitching(true);
		const result = await selectTenant(id);
		if (result.ok) {
			router.push(`/orgs/${id}/clients`);
			router.refresh();
			return;
		}
		if (isSignedOut(result.error)) {
			toSignIn();
			return;
		}
		toast.show(message(result.error), "danger");
		setSwitching(false);
	}

	return (
		<div className="flex min-w-0 items-center rounded-md border border-border bg-surface-raised shadow-raised">
			<Link
				href="/orgs"
				aria-label={t("shell.org.allOrganizations", { name: active.name })}
				className="flex min-h-9 min-w-0 items-center gap-2 rounded-l-md px-2 hover:bg-surface-raised-hovered focus-visible:outline-2 focus-visible:outline-border-focused active:bg-surface-raised-pressed"
			>
				<Initial name={active.name} className="size-6 font-body-sm" />
				<span
					title={active.name}
					className="min-w-0 truncate font-body-sm text-text-primary"
				>
					{active.name}
				</span>
			</Link>
			<Menu.Root
				open={open}
				onOpenChange={(next) => {
					// while a switch is pending the menu does not open (P-8)
					if (next && switching) return;
					setOpen(next);
				}}
			>
				<Menu.Trigger
					aria-label={t("tenants.list.switch")}
					aria-disabled={switching ? "true" : undefined}
					aria-busy={switching ? "true" : undefined}
					className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-r-md border-l border-border text-icon-subtle hover:bg-surface-raised-hovered focus-visible:outline-2 focus-visible:outline-border-focused aria-disabled:cursor-wait aria-disabled:text-icon-disabled data-popup-open:bg-surface-raised-pressed"
				>
					<ChevronsUpDownIcon aria-hidden="true" className="size-4" />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner
						side="bottom"
						align="start"
						sideOffset={4}
						className="z-50"
					>
						<Menu.Popup className="flex max-h-[min(var(--available-height),28rem)] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-y-auto rounded-md bg-surface-overlay py-1 text-text-primary shadow-overlay focus:outline-none">
							<Menu.Group>
								<Menu.GroupLabel className="px-3 pt-2 pb-1 font-body-xs text-text-secondary">
									{t("shell.org.menuTitle")}
								</Menu.GroupLabel>
								<OrgList
									activeId={active.id}
									onChoose={choose}
									onSignedOut={toSignIn}
								/>
							</Menu.Group>
							<Menu.Separator className="my-1 h-px bg-border" />
							<Menu.LinkItem
								closeOnClick
								render={<Link href="/create-tenant" />}
								className={ITEM}
							>
								<PlusIcon aria-hidden="true" className="size-4 text-icon" />
								{t("tenants.list.create")}
							</Menu.LinkItem>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>
		</div>
	);
}

type ListState =
	| { kind: "loading" }
	| { kind: "error"; error: string }
	| { kind: "ready"; tenants: Tenant[] };

// Mounts on each open, so every open lists the organizations again (P-1).
function OrgList({
	activeId,
	onChoose,
	onSignedOut,
}: Readonly<{
	activeId: string;
	onChoose: (id: string) => void;
	onSignedOut: () => void;
}>) {
	const t = useTranslations("tenants.list");
	const message = useErrorMessage();
	const [state, setState] = useState<ListState>({ kind: "loading" });
	const [attempt, setAttempt] = useState(0);
	const signedOut = useEffectEvent(onSignedOut);

	// biome-ignore lint/correctness/useExhaustiveDependencies: the retry counter intentionally starts a new request.
	useEffect(() => {
		let cancelled = false;
		setState({ kind: "loading" });
		listTenants()
			.then((result) => {
				if (cancelled) return;
				if (result.ok) setState({ kind: "ready", tenants: result.tenants });
				else if (isSignedOut(result.error)) signedOut();
				else setState({ kind: "error", error: result.error });
			})
			.catch(() => {
				if (!cancelled) setState({ kind: "error", error: "unexpected" });
			});
		return () => {
			cancelled = true;
		};
	}, [attempt]);

	if (state.kind === "loading")
		return (
			<output className="block px-3 py-2 font-body-sm text-text-secondary">
				{t("loading")}
			</output>
		);

	if (state.kind === "error")
		return (
			<>
				<p className="px-3 py-2 font-body-sm text-text-status-danger">
					{message(state.error)}
				</p>
				<Menu.Item
					closeOnClick={false}
					onClick={() => setAttempt((n) => n + 1)}
					className={ITEM}
				>
					{t("retry")}
				</Menu.Item>
			</>
		);

	return (
		<Menu.RadioGroup value={activeId} onValueChange={onChoose}>
			{state.tenants.map((tenant) => (
				<Menu.RadioItem
					key={tenant.id}
					value={tenant.id}
					disabled={tenant.status !== "active"}
					closeOnClick
					className={ITEM}
				>
					<Initial name={tenant.name} className="size-5 font-body-xs" />
					<span className="min-w-0 flex-1 truncate">{tenant.name}</span>
					{tenant.status === "suspended" && (
						<span className="shrink-0 font-body-xs text-text-secondary">
							{t("statuses.suspended")}
						</span>
					)}
					<Menu.RadioItemIndicator className="shrink-0 text-icon-brand">
						<CheckIcon aria-hidden="true" className="size-4" />
					</Menu.RadioItemIndicator>
				</Menu.RadioItem>
			))}
		</Menu.RadioGroup>
	);
}

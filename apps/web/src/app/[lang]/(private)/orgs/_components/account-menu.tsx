"use client";

import { Menu } from "@base-ui/react/menu";
import {
	CheckIcon,
	LogOutIcon,
	MonitorIcon,
	MoonIcon,
	SunIcon,
	UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { logout } from "@/lib/api/login";
import { getMe } from "@/lib/api/me";
import { isSignedOut } from "@/lib/api/signed-out";
import { useErrorMessage } from "./org-switcher";

type EmailState =
	| { kind: "idle" }
	| { kind: "loading" }
	| { kind: "ready"; email: string }
	| { kind: "failed" };

const ITEM =
	"flex min-h-9 cursor-pointer items-center gap-2 px-3 py-2 font-body-sm text-text-primary outline-none data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-highlighted:bg-surface-hovered";

const SEPARATOR = "my-1 h-px bg-border";

const THEMES = [
	{ value: "system", Icon: MonitorIcon },
	{ value: "dark", Icon: MoonIcon },
	{ value: "light", Icon: SunIcon },
] as const;

// The account button at the header's end (SPEC-0008 §4.3): the user's e-mail,
// the profile, the theme and signing out.
export function AccountMenu() {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const toast = useToast();
	const message = useErrorMessage();
	const { theme, setTheme } = useTheme();
	const [email, setEmail] = useState<EmailState>({ kind: "idle" });
	const [signingOut, setSigningOut] = useState(false);

	// The e-mail is requested on the first open and kept; a failure is
	// requested again on the next open (P-2).
	async function loadEmail() {
		setEmail({ kind: "loading" });
		const result = await getMe();
		if (result.ok) setEmail({ kind: "ready", email: result.user.email });
		else if (isSignedOut(result.error))
			router.replace({ pathname: "/login", query: { next: pathname } });
		else setEmail({ kind: "failed" });
	}

	async function signOut() {
		if (signingOut) return;
		setSigningOut(true);
		try {
			await logout();
		} catch {
			toast.show(message("network.unavailable"), "danger");
			setSigningOut(false);
			return;
		}
		router.replace("/login");
		router.refresh();
	}

	let emailLabel: string | null = null;
	if (email.kind === "ready") emailLabel = email.email;
	else if (email.kind === "loading" || email.kind === "idle")
		emailLabel = t("common.loading");

	return (
		<Menu.Root
			onOpenChange={(open) => {
				if (open && (email.kind === "idle" || email.kind === "failed"))
					void loadEmail();
			}}
		>
			<Menu.Trigger
				aria-label={t("shell.account.open")}
				className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-background-brand-subtlest text-icon-brand hover:bg-background-brand-subtlest-hovered focus-visible:outline-2 focus-visible:outline-border-focused active:bg-background-brand-subtlest-pressed data-popup-open:bg-background-brand-subtlest-pressed"
			>
				<UserIcon aria-hidden="true" className="size-5" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner
					side="bottom"
					align="end"
					sideOffset={4}
					className="z-50"
				>
					<Menu.Popup className="flex w-[min(16rem,calc(100vw-2rem))] flex-col rounded-md bg-surface-overlay py-1 text-text-primary shadow-overlay focus:outline-none">
						<Menu.Group>
							{emailLabel !== null && (
								<>
									<Menu.GroupLabel className="truncate px-3 py-2 font-body-sm font-semibold text-text-primary">
										{emailLabel}
									</Menu.GroupLabel>
									<Menu.Separator className={SEPARATOR} />
								</>
							)}
							<Menu.LinkItem
								closeOnClick
								render={<Link href="/@me" />}
								className={ITEM}
							>
								<UserIcon aria-hidden="true" className="size-4 text-icon" />
								{t("shell.account.profile")}
							</Menu.LinkItem>
						</Menu.Group>
						<Menu.Separator className={SEPARATOR} />
						<Menu.Group>
							<Menu.GroupLabel className="px-3 pt-2 pb-1 font-body-xs text-text-secondary">
								{t("shell.account.theme")}
							</Menu.GroupLabel>
							<Menu.RadioGroup
								value={theme ?? "system"}
								onValueChange={(value: string) => setTheme(value)}
							>
								{THEMES.map(({ value, Icon }) => (
									<Menu.RadioItem key={value} value={value} className={ITEM}>
										<Icon aria-hidden="true" className="size-4 text-icon" />
										<span className="flex-1">
											{t(`shell.account.themes.${value}`)}
										</span>
										<Menu.RadioItemIndicator className="text-icon-brand">
											<CheckIcon aria-hidden="true" className="size-4" />
										</Menu.RadioItemIndicator>
									</Menu.RadioItem>
								))}
							</Menu.RadioGroup>
						</Menu.Group>
						<Menu.Separator className={SEPARATOR} />
						<Menu.Item
							closeOnClick={false}
							disabled={signingOut}
							onClick={signOut}
							className={ITEM}
						>
							<LogOutIcon aria-hidden="true" className="size-4 text-icon" />
							{signingOut
								? t("dashboard.signing-out")
								: t("dashboard.sign-out")}
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

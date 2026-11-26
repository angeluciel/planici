"use client";

import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import { Logo } from "@/components/logo";
import { useWideNav } from "@/hooks/use-media-query";
import { AccountMenu } from "./account-menu";
import { OrgSwitcher } from "./org-switcher";

type HeaderProps = {
	navOpen: boolean;
	onOpenNav: () => void;
	navButtonRef: RefObject<HTMLButtonElement | null>;
};

// The app header (SPEC-0008 §4.1). Wide: logo, "/", the organization switcher
// and the account menu at the end. Narrow: the switcher, then the navigation
// button and the account menu as one pair.
export default function Header({
	navOpen,
	onOpenNav,
	navButtonRef,
}: Readonly<HeaderProps>) {
	const t = useTranslations("shell.nav");
	const wide = useWideNav();

	return (
		<header className="flex w-full items-center gap-3 border-b border-border px-4 py-2">
			{wide && (
				<div className="flex shrink-0 items-center gap-3">
					<Logo className="h-7 w-auto" />
					<span aria-hidden="true" className="font-body-lg text-text-disabled">
						/
					</span>
				</div>
			)}
			<OrgSwitcher />
			<div className="ml-auto flex shrink-0 items-center">
				{wide ? (
					<AccountMenu />
				) : (
					<fieldset className="flex items-center gap-1 rounded-md border border-border p-0.5">
						<button
							ref={navButtonRef}
							type="button"
							aria-label={t("open")}
							aria-expanded={navOpen}
							aria-haspopup="dialog"
							onClick={onOpenNav}
							className="flex size-9 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused active:bg-surface-pressed"
						>
							<MenuIcon aria-hidden="true" className="size-5" />
						</button>
						<AccountMenu />
					</fieldset>
				)}
			</div>
		</header>
	);
}

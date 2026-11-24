import { Building2Icon, MenuIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type HeaderProps = {
	isSidebarOpen: boolean;
	onOpenSidebar: () => void;
};

export default function Header({
	isSidebarOpen,
	onOpenSidebar,
}: Readonly<HeaderProps>) {
	const t = useTranslations("tenants.list");

	return (
		<header className="flex w-full items-center justify-between border-b border-border px-4 pt-2 pb-3">
			{/* left */}
			<div className="flex gap-3 w-full">
				<button
					type="button"
					aria-expanded={isSidebarOpen}
					aria-controls="mobile-sidebar"
					aria-label="Abrir menu principal"
					aria-haspopup="dialog"
					onClick={onOpenSidebar}
					className="size-12 rounded-lg text-icon hover:bg-surface-hovered flex items-center justify-center focus-visible:outline-2 focus-visible:outline-border-focused md:hidden"
				>
					<MenuIcon aria-hidden="true" />
				</button>
				<Link
					href="/orgs"
					className="flex min-h-11 items-center gap-2 rounded-md px-3 font-body-sm text-text-secondary hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
				>
					<Building2Icon aria-hidden="true" className="size-5 shrink-0" />
					{t("switch")}
				</Link>
			</div>

			{/* right */}
			<div className="flex rounded-md bg-surface-raised shadow-raised">
				<button
					type="button"
					className="px-3 py-1.5 w-full text-icon rounded-sm hover:bg-surface-raised-hovered active:bg-surface-raised-pressed"
					aria-label="Pesquisar"
				>
					<SearchIcon />
				</button>
				<button
					type="button"
					className="px-3 py-1.5 w-full text-icon rounded-sm hover:bg-surface-raised-hovered active:bg-surface-raised-pressed"
					aria-label="Adicionar"
				>
					<PlusIcon />
				</button>
			</div>
		</header>
	);
}

import {
	BookOpenIcon,
	Calendar1Icon,
	ChartLineIcon,
	CheckCircle2Icon,
	CoinsIcon,
	Settings2Icon,
	UserRoundPenIcon,
	WalletCardsIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const groups = [
	{ label: "Agenda", items: [{ label: "Agenda Rápida", icon: Calendar1Icon }] },
	{
		label: "Trabalho",
		items: [
			{ label: "Clientes", icon: UserRoundPenIcon, path: "clients" },
			{ label: "Serviços", icon: CoinsIcon, path: "services" },
			{ label: "Pacotes e Planos", icon: BookOpenIcon },
			{ label: "Formulários", icon: CheckCircle2Icon, path: "forms" },
		],
	},
	{
		label: "Contas",
		items: [
			{ label: "Faturas", icon: WalletCardsIcon },
			{ label: "Dashboard", icon: ChartLineIcon },
		],
	},
] as const;

export function SidebarContent({
	expanded,
	onNavigate,
}: Readonly<{ expanded: boolean; onNavigate?: () => void }>) {
	const { tenant } = useParams<{ tenant: string }>();
	const pathname = usePathname();
	const labelClass = cn("whitespace-nowrap", !expanded && "sr-only");

	return (
		<>
			{/* profile section */}
			<div className="flex h-20 shrink-0 items-center gap-3 overflow-hidden">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blanket font-body-sm">
					{/* TODO: change to show the user name */}
					LB
				</div>
				<div className={labelClass}>
					<h2 className="font-heading-2xs text-text-primary">user name</h2>
					<span className="font-body-sm text-text-secondary">ver perfil</span>
				</div>
			</div>
			{/* main content */}
			<nav
				aria-label="Menu principal"
				className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
			>
				{groups.map((group, index) => (
					<section
						key={group.label}
						aria-label={group.label}
						className={cn(
							"flex flex-col gap-1 py-1",
							index > 0 && "border-t border-border",
						)}
					>
						{group.items.map((item) => {
							const Icon = item.icon;
							const href =
								"path" in item ? `/orgs/${tenant}/${item.path}` : undefined;
							const active =
								href !== undefined &&
								(pathname === href || pathname.startsWith(`${href}/`));
							const content = (
								<>
									<Icon
										aria-hidden="true"
										className="size-5 shrink-0 stroke-[1.5]"
									/>
									<span className={labelClass}>{item.label}</span>
								</>
							);
							return href ? (
								<Link
									key={item.label}
									href={href}
									onClick={onNavigate}
									aria-current={active ? "page" : undefined}
									title={!expanded ? item.label : undefined}
									className={cn(
										"nav-item",
										active && "bg-surface-pressed font-medium text-text-bold",
									)}
								>
									{content}
								</Link>
							) : (
								// These pages do not exist yet; do not send users to invented routes.
								<button
									key={item.label}
									type="button"
									disabled
									title={`${item.label} — em breve`}
									className={cn("nav-item", "cursor-not-allowed opacity-50")}
								>
									{content}
								</button>
							);
						})}
					</section>
				))}
			</nav>
			{/* bottom content */}
			<div className="shrink-0 border-t border-border py-1">
				<button
					type="button"
					disabled
					title="Configurações — em breve"
					className={cn("nav-item", "cursor-not-allowed opacity-50")}
				>
					<Settings2Icon
						aria-hidden="true"
						className="size-5 stroke-[1.5] shrink-0"
					/>
					<span className={labelClass}>Configurações</span>
				</button>
			</div>
		</>
	);
}

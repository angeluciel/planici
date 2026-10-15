import { PlusIcon, SearchIcon } from "lucide-react";

type HeaderProps = {
	isSidebarOpen: boolean;
	onOpenSidebar: () => void;
};

export default function Header({
	isSidebarOpen,
	onOpenSidebar,
}: Readonly<HeaderProps>) {
	return (
		<header className="flex w-full justify-between px-4 pt-2 pb-3border-b border-border">
			{/* left */}
			<div className="flex gap-3 w-full">
				<button
					type="button"
					aria-expanded={isSidebarOpen}
					aria-controls="sidebar"
					onClick={onOpenSidebar}
					className="size-12 rounded-lg bg-blanket flex items-center justify-center md:hidden"
				>
					LB
				</button>
			</div>

			{/* right */}
			<div className="flex rounded-md bg-surface-raised shadow-raised">
				<button
					type="button"
					className="px-3 py-1.5 w-full text-icon rounded-sm hover:bg-surface-raised-hovered active:bg-surface-raised-pressed"
				>
					<SearchIcon />
				</button>
				<button
					type="button"
					className="px-3 py-1.5 w-full text-icon rounded-sm hover:bg-surface-raised-hovered active:bg-surface-raised-pressed"
				>
					<PlusIcon />
				</button>
			</div>
		</header>
	);
}

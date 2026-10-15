"use client";
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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Separator from "@/components/ui/separator";

type SidebarProps = {
	isSidebarOpen: boolean;
	onClose: () => void;
};

export default function Sidebar(props: Readonly<SidebarProps>) {
	const { isSidebarOpen, onClose } = props;

	return (
		<>
			{isSidebarOpen && (
				<button
					type="button"
					aria-label="Fechar menu"
					className="fixed inset-0 z-40 bg-blanket md:hidden"
					onClick={onClose}
				/>
			)}

			<aside
				id="sidebar"
				aria-label="Menu principal"
				className={`
					fixed inset-y-0 left-0 z-50 h-dvh w-[calc(100dvw-120px)] overflow-y-auto flex-col gap-3 bg-surface-raised px-4 pt-10 md:flex md:w-70 md:bg-surface
					${isSidebarOpen ? "flex" : "hidden"}
				`}
			>
				{/* header */}
				<div className="flex flex-col w-full py-2">
					<div className="flex w-full gap-3">
						{/* avatar */}
						<div className="size-12 rounded-lg bg-blanket flex items-center justify-center">
							LB
						</div>
						{/* buttons */}
						<div className="flex flex-col justify-between items-start">
							<h2 className="font-heading-2xs text-text-primary">user name</h2>
							<span className="text-text-secondary font-body-sm">
								ver perfil
							</span>
						</div>
					</div>
				</div>

				{/* buttons */}
				<div className="flex flex-1 flex-col w-full justify-between items-start">
					{/* main buttons */}
					<div className="flex flex-col w-full gap-3">
						{/* 1st section */}
						<section className="flex flex-col w-full gap-1">
							<Button
								text="Agenta Rápida"
								leadingIcon={Calendar1Icon}
								variant="subtle"
								size="lg"
							/>
						</section>
						<Separator />
						<section className="flex flex-col w-full gap-1">
							<h2 className="px-1.5 font-heading-2xs text-text-bold">
								Trabalho
							</h2>
							<Button
								text="Clientes"
								leadingIcon={UserRoundPenIcon}
								variant="subtle"
								size="lg"
							/>
							<Button
								text="Serviços"
								leadingIcon={CoinsIcon}
								variant="subtle"
								size="lg"
							/>
							<Button
								text="Pacotes e Planos"
								leadingIcon={BookOpenIcon}
								variant="subtle"
								size="lg"
							/>
							<Button
								text="Formulários"
								leadingIcon={CheckCircle2Icon}
								variant="subtle"
								size="lg"
							/>
						</section>
						<Separator />
						<section className="flex flex-col w-full gap-1">
							<h2 className="px-1.5 font-heading-2xs text-text-bold">Contas</h2>
							<Button
								text="Faturas"
								leadingIcon={WalletCardsIcon}
								variant="subtle"
								size="lg"
							/>
							<Button
								text="Dashboard"
								leadingIcon={ChartLineIcon}
								variant="subtle"
								size="lg"
							/>
						</section>
					</div>

					{/* bottom buttons */}
					<div className="flex flex-col gap-6 py-3 w-full">
						<Button
							text="Configurações"
							leadingIcon={Settings2Icon}
							variant="subtle"
							size="lg"
						/>
					</div>
				</div>
			</aside>
		</>
	);
}

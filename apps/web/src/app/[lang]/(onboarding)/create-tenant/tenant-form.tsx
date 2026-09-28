"use client";
import { ArrowBigLeftDash, ArrowBigRightDash, UserIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/button";
import { Combobox } from "@/components/combobox";
import { Logo } from "@/components/logo";
import { maskEmail } from "@/lib/mask";

type OPTION = { value: string; label: string };
const options: OPTION[] = [
	{ label: "Terapeuta", value: "therapy" },
	{ label: "Desenhista", value: "drawing" },
];

function ProfessionStep({ onNext }: { onNext: () => void }) {
	return (
		<form className="flex flex-col gap-5 items-center w-full">
			<Combobox
				label="Qual sua Profissão?"
				items={options}
				placeholder="Terapeuta"
			/>
			<Button text="Confirmar" variant="primary" />
		</form>
	);
}

function NamingStep({ onNext }: { onNext: () => void }) {
	const [useSuggestion, setUseSuggestion] = useState(true);
	const [personalizing, setPersonalizing] = useState(false);

	return (
		<form className="flex flex-col gap-5 items-center w-full">
			<div className="flex flex-col gap-4">
				<h1 className="text-text-primary font-heading-md">Sugestões</h1>
				<div className="flex flex-col">
					<div className="flex gap-1 items-center">
						<div className="flex min-w-35 gap-2 p-1">
							<UserIcon className="text-icon-disabled" />
							<span className="text-text-disabled font-body-sm font-medium">
								clientes
							</span>
						</div>
						{useSuggestion ? (
							<ArrowBigRightDash className="text-icon-brand" />
						) : (
							<ArrowBigLeftDash className="text-icon" />
						)}
						<div className="flex min-w-35 gap-2 p-1">
							<UserIcon className="text-icon" />
							<input
								className="placeholder:text-text-primary font-body-sm font-medium"
								disabled={!personalizing}
								placeholder="pacientes"
							/>
						</div>
					</div>
				</div>
			</div>
		</form>
	);
}

export function TenantForm() {
	return (
		<div className="flex flex-col gap-8 justify-center items-center max-w-lg w-full">
			<div className="flex flex-col gap-12 items-center">
				<div className="flex flex-col gap-12 items-center">
					<Logo className="h-8 w-auto" />
				</div>
				<div className="flex flex-col gap-1 items-center">
					<h1 /* ref={headingRef} */ tabIndex={-1} className="font-heading-lg">
						Bem vindo(a) ao Planici
					</h1>
					<span className="font-body-md text-text-accent-gray text-center">
						Vamos iniciar configurando sua organização
					</span>
				</div>
			</div>

			<NamingStep onNext={() => console.log("alo")} />
		</div>
	);
}

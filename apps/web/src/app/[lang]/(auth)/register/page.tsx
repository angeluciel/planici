"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import Header from "@/components/header";
import { Logo } from "@/components/logo";
import { RegisterStepper } from "@/components/register-stepper";
import { AccountStep, PasswordStep, ProfileStep, TermsStep } from "./steps";

interface FormData {
	email: string;
	password: string;
	acceptedTerms: boolean;
}

const initialData: FormData = {
	email: "",
	password: "",
	acceptedTerms: false,
};

const steps = [AccountStep, PasswordStep, TermsStep, ProfileStep] as const;

const titles = ["first", "second", "third"] as const;

type Title = (typeof titles)[number];

export default function RegisterPage() {
	const [currentStep, setCurrentStep] = useState(0);
	const [formData, setFormData] = useState<FormData>(initialData);

	const [title, setTitle] = useState(0);

	const StepComponent = steps[currentStep];

	function goBack() {
		setCurrentStep((step) => Math.max(0, step - 1));
		setTitle((step) => Math.max(0, step - 1));
	}

	function goForward() {
		//async
		const isValid = true; // validate current step with the form data

		if (!isValid) return;

		const isLastStep = currentStep === steps.length - 1;

		if (isLastStep) {
			// eslint-disable-next-line no-console
			console.log("submit registration");
			return;
		}

		setCurrentStep((step) => step + 1);
		setTitle((step) => step + 1);
	}

	const t = useTranslations("auth.register");

	const stepsT = [
		{ name: t("steps.first.stepper"), href: "/a" },
		{ name: t("steps.second.stepper"), href: "/b" },
		{ name: t("steps.third.stepper"), href: "/b" },
		{ name: t("steps.fourth.stepper"), href: "/b" },
	];

	return (
		<>
			<div className="min-h-screen flex flex-1 px-4 bg-surface">
				<div className="flex flex-col grow justify-between items-center">
					<Header />

					<div className="flex flex-col gap-8 justify-center items-center">
						<div className="flex flex-col gap-12 items-center">
							<div className="flex flex-col gap-12 items-center">
								<Logo className="h-8 w-auto" />

								<RegisterStepper currentStep={1} steps={stepsT} />
							</div>

							<h1 className="font-heading-lg">Vamos Criar sua conta</h1>
						</div>

						<div className="flex flex-col gap-4 items-center w-full">
							<button className="w-full px-4 h-10 gap-2 border-2 border-border font-body-sm font-medium rounded-md">
								Continuar com Google
							</button>
							<div className="flex gap-2 items-center text-text-bold">
								<div className="h-0.5 w-full bg-background-accent-disabled" />
								ou
								<div className="h-0.5 w-full bg-background-accent-disabled" />
							</div>
							<label className="gap-1 flex flex-col items-start font-body-sm font-medium w-full">
								Seu e-mail
								<input
									className="flex rounded-md justify-start border-2 border-border-input placeholder:text-text-disabled text-text-bold text-body-sm p-2 w-full"
									placeholder="email@example.com"
								/>
							</label>
							<div className="flex flex-col gap-8 items-center w-full">
								<div className="flex justify-center items-center w-full gap-1.5 h-9 px-2 rounded-sm bg-background-brand-bold text-text-inverse">
									{" "}
									Continuar com e-mail{" "}
								</div>
								<span>
									Já tem uma conta?{" "}
									<Link className="text-text-link" href={"/login"}>
										Entrar
									</Link>
									.
								</span>
							</div>
						</div>
					</div>

					<footer className="flex w-full pb-4 items-center-safe justify-center-safe">
						<span className="font-body-caption">
							2026 PLANICI, Todos os Direitos Reservados
						</span>
					</footer>
				</div>

				<div className="hidden md:block"></div>
			</div>
		</>
	);
}

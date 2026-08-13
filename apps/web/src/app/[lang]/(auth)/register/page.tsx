"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import Header from "@/components/header";
import { Logo } from "@/components/logo";
import { RegisterStepper } from "@/components/register-stepper";
import {
  AccountStep,
  PasswordStep,
  ProfileStep,
  TermsStep,
} from "./_components/steps";
import RegisterFlow from "./_components/RegisterFlow";

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
    <div className="min-h-screen flex flex-1 px-4 bg-surface">
      <div className="flex flex-col grow justify-between items-center">
        <Header />

        <RegisterFlow />

        <footer className="flex w-full pb-4 items-center-safe justify-center-safe">
          <span className="font-body-caption">
            2026 PLANICI, Todos os Direitos Reservados
          </span>
        </footer>
      </div>

      <div className="hidden md:block"></div>
    </div>
  );
}

"use client";

import { getTranslations } from "next-intl/server";
import type { StepProps, RegisterData } from "@/types/register";
import Link from "next/link";
import { CreateUser } from "@planici/schemas";

type Values = Pick<RegisterData, "email" | "password">;
type Errors = Partial<Record<keyof Values, string>>;

async function AccountStep() {
  const t = await getTranslations("auth.register.steps.first");
  return (
      <div className="flex flex-col gap-4 items-center w-full">
        <button
          type="button"
          className="w-full px-4 h-10 gap-2 border-2 border-border font-body-sm font-medium rounded-md"
        >
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
            Continuar com e-mail
          </div>
          <span>
            Já tem uma conta?
            <Link className="text-text-link" href={"/login"}>
              Entrar
            </Link>
            .
          </span>
        </div>
      </div>
  );
}

function PasswordStep() {
  return <div>a</div>;
}

function TermsStep() {
  return <div>a</div>;
}

function ProfileStep() {
  return <div>a</div>;
}

export { AccountStep, PasswordStep, TermsStep, ProfileStep };

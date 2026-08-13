import { Logo } from "@/components/logo"
import { AccountStep, PasswordStep, ProfileStep, TermsStep } from "./steps"
import { RegisterStepper } from "@/components/register-stepper"
import { useTranslations } from "next-intl";

type Step = 'account' | 'password' | 'profile' | 'terms'

export default function RegisterFlow(currentStep: Step) {

  const t = useTranslations("auth.register");
  
  const stepsT = [
    { name: t("steps.first.stepper"), href: "/a" },
    { name: t("steps.second.stepper"), href: "/b" },
    { name: t("steps.third.stepper"), href: "/b" },
    { name: t("steps.fourth.stepper"), href: "/b" },
  ];
  
  return (
    <div className="flex flex-col gap-8 justify-center items-center">
      <div className="flex flex-col gap-12 items-center">
        <div className="flex flex-col gap-12 items-center">
          <Logo className="h-8 w-auto" />

          <RegisterStepper currentStep={1} steps={stepsT} />
        </div>

        <h1 className="font-heading-lg">Vamos Criar sua conta</h1>
      </div>

      { currentStep === 'account' && <AccountStep></AccountStep> }
      { currentStep === 'password' && <PasswordStep></PasswordStep> }
      { currentStep === 'profile' && <ProfileStep></ProfileStep> }
      { currentStep === 'terms' && <TermsStep></TermsStep> }
    </div>
  )
}

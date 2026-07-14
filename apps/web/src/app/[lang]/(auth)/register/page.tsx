import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { RegisterStepper } from '@/components/register-stepper';

export default async function RegisterPage() {
  const t = await getTranslations('auth.register');

  const steps = [
    { name: t('stepper.1'), href: '/a' },
    { name: t('stepper.2'), href: '/b' },
    { name: t('stepper.3'), href: '/b' },
    { name: t('stepper.4'), href: '/b' },
  ];
  return (
    <>
      <div className='min-h-screen flex flex-1 px-4 bg-surface'>
        <div className='flex flex-col grow justify-between items-center'>
          {/* header */}
          <div className='min-w-full py-3 flex justify-start items-center'>
            <button className='p-3 rounded-md bg-surface-raised hover:bg-surface-raised-hovered shadow-raised transition-all duration-100 active:bg-surface-raised-pressed'>
              <ArrowLeft />
            </button>
          </div>

          <div className='flex flex-col gap-8 justify-center items-center'>
            <div className='flex flex-col gap-12 items-center'>
              <div className='flex flex-col gap-12 items-center'>
                {/* ICON LATER */}
                <div className='w-20 h-10 rounded-sm bg-icon-brand'></div>

                <RegisterStepper currentStep={1} steps={steps} />
              </div>

              <h1 className='font-heading-lg'>Vamos Criar sua conta</h1>
            </div>

            <div className='flex flex-col gap-4 items-center w-full'>
              <button className='w-full px-4 h-10 gap-2 border-2 border-border font-body-sm font-medium rounded-md'>
                Continuar com Google
              </button>
              <div className='flex gap-2 items-center text-text-bold'>
                <div className='h-0.5 w-full bg-background-accent-disabled' />
                ou
                <div className='h-0.5 w-full bg-background-accent-disabled' />
              </div>
              <label className='gap-1 flex flex-col items-start font-body-sm font-medium w-full'>
                Seu e-mail
                <input
                  className='flex rounded-md justify-start border-2 border-border-input placeholder:text-text-disabled text-text-bold text-body-sm p-2 w-full'
                  placeholder='email@example.com'
                />
              </label>
            </div>
          </div>

          <div className='flex w-full pb-4 items-center-safe justify-center-safe'>
            <span className='font-body-caption'>
              2026 PLANICI, Todos os Direitos Reservados
            </span>
          </div>
        </div>

        <div className='hidden md:block'></div>
      </div>
    </>
  );
}

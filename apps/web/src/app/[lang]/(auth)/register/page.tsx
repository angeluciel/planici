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

          <div>
            <RegisterStepper steps={steps} currentStep={2} />
          </div>

          <div></div>
        </div>

        <div className='hidden md:block'></div>
      </div>
    </>
  );
}

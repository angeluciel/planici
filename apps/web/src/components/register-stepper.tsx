'use client';

import Link from 'next/link';
import { Fragment } from 'react/jsx-runtime';

import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  type StepState,
} from './ui/stepper';

import { cn } from '@/lib/utils';

interface Step {
  name: string;
  href: string;
}

function getState(index: number, currentStep: number): StepState {
  const step = index + 1;
  if (step < currentStep) return 'completed';
  if (step === currentStep) return 'current';
  return 'upcoming';
}

export function RegisterStepper({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: Step[];
}) {
  return (
    <>
      <Stepper className='hidden lg:flex'>
        {steps.map((step, i) => (
          <Fragment key={step.name}>
            <StepperItem state={getState(i, currentStep)}>
              <StepperIndicator state={getState(i, currentStep)}>
                {i + 1}
              </StepperIndicator>
              <Link className='' href={step.href}>
                {step.name}
              </Link>
            </StepperItem>

            {i < steps.length - 1 && <StepperSeparator />}
          </Fragment>
        ))}
      </Stepper>
      <ol
        className='flex gap-2 h-2 lg:hidden min-w-60'
        aria-label='Progresso do cadastro'
      >
        {steps.map((step, i) => {
          return (
            <li
              key={step.name}
              className={cn(
                'h-full flex-1 rounded-lg',
                getState(i, currentStep) === 'current'
                  ? 'bg-background-brand-bold'
                  : 'bg-background-brand-subtler',
              )}
            ></li>
          );
        })}
      </ol>
    </>
  );
}

import Link from 'next/link';
import { Fragment } from 'react/jsx-runtime';

import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  type StepState,
} from './ui/stepper';

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
  );
}

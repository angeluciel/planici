import React from 'react';

import { cn } from '@/lib/utils';

type StepState = 'completed' | 'current' | 'upcoming';

function Stepper({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex min-w-2xl items-center', className)} {...props} />
  );
}

function StepperItem({
  state,
  className,
  ...props
}: React.ComponentProps<'div'> & { state: StepState }) {
  return (
    <div
      data-state={state}
      className={cn(
        'flex rounded-lg border-2 p-2 shrink-0 min-w-max gap-2 font-body-sm items-center',
        state === 'completed' &&
          'border-border-brand bg-background-brand-subtlest text-text-bold',
        state === 'current' &&
          'border-border-brand text-text-bold cursor-default',
        state === 'upcoming' &&
          'border-border-disabled text-text-disabled cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}

function StepperIndicator({
  className,
  state,
  ...props
}: React.ComponentProps<'div'> & { state: StepState }) {
  return (
    <div
      className={cn(
        'size-6 rounded-full flex items-center justify-center font-bold font-body-sm',
        state === 'completed' && 'bg-background-brand-bold text-text-inverse',
        state === 'current' && 'bg-background-brand-subtlest text-text-bold',
        state === 'upcoming' &&
          'bg-background-accent-disabled text-text-disabled',
        className,
      )}
      {...props}
    />
  );
}

function StepperSeparator({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('h-px flex-1 bg-border-brand', className)} {...props} />
  );
}

export { Stepper, StepperItem, StepperIndicator, StepperSeparator };
export type { StepState };

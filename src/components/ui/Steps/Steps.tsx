'use client';

import * as React from 'react';
import { Steps as TGSteps } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type StepsProps = React.ComponentProps<typeof TGSteps>;

export const Steps = React.forwardRef<React.ElementRef<typeof TGSteps>, StepsProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSteps ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Steps.displayName = 'Steps';

Object.assign(Steps, TGSteps);

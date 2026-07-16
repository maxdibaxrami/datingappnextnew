'use client';

import * as React from 'react';
import { Spinner as TGSpinner } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SpinnerProps = React.ComponentProps<typeof TGSpinner>;

export const Spinner = React.forwardRef<React.ElementRef<typeof TGSpinner>, SpinnerProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSpinner ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Spinner.displayName = 'Spinner';

Object.assign(Spinner, TGSpinner);

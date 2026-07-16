'use client';

import * as React from 'react';
import { Progress as TGProgress } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type ProgressProps = React.ComponentProps<typeof TGProgress>;

export const Progress = React.forwardRef<React.ElementRef<typeof TGProgress>, ProgressProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGProgress ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Progress.displayName = 'Progress';

Object.assign(Progress, TGProgress);

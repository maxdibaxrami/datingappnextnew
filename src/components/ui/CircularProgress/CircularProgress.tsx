'use client';

import * as React from 'react';
import { CircularProgress as TGCircularProgress } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type CircularProgressProps = React.ComponentProps<typeof TGCircularProgress>;

export const CircularProgress = React.forwardRef<React.ElementRef<typeof TGCircularProgress>, CircularProgressProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGCircularProgress ref={ref} className={cn('', className)} {...props} />
    );
  }
);
CircularProgress.displayName = 'CircularProgress';

Object.assign(CircularProgress, TGCircularProgress);

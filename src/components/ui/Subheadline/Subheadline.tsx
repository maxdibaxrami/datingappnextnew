'use client';

import * as React from 'react';
import { Subheadline as TGSubheadline } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SubheadlineProps = React.ComponentProps<typeof TGSubheadline>;

export const Subheadline = React.forwardRef<React.ElementRef<typeof TGSubheadline>, SubheadlineProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSubheadline ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Subheadline.displayName = 'Subheadline';

Object.assign(Subheadline, TGSubheadline);

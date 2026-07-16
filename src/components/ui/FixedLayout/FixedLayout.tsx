'use client';

import * as React from 'react';
import { FixedLayout as TGFixedLayout } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type FixedLayoutProps = React.ComponentProps<typeof TGFixedLayout>;

export const FixedLayout = React.forwardRef<React.ElementRef<typeof TGFixedLayout>, FixedLayoutProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGFixedLayout ref={ref} className={cn('', className)} {...props} />
    );
  }
);
FixedLayout.displayName = 'FixedLayout';

Object.assign(FixedLayout, TGFixedLayout);

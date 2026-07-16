'use client';

import * as React from 'react';
import { Divider as TGDivider } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type DividerProps = React.ComponentProps<typeof TGDivider>;

export const Divider = React.forwardRef<React.ElementRef<typeof TGDivider>, DividerProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGDivider ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Divider.displayName = 'Divider';

Object.assign(Divider, TGDivider);

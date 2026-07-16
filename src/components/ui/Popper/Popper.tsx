'use client';

import * as React from 'react';
import { Popper as TGPopper } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type PopperProps = React.ComponentProps<typeof TGPopper>;

export const Popper = React.forwardRef<React.ElementRef<typeof TGPopper>, PopperProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGPopper ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Popper.displayName = 'Popper';

Object.assign(Popper, TGPopper);

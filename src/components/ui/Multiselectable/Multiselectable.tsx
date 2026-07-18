'use client';

import * as React from 'react';
import { Multiselectable as TGMultiselectable } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type MultiselectableProps = React.ComponentProps<typeof TGMultiselectable>;

export const Multiselectable = React.forwardRef<React.ElementRef<typeof TGMultiselectable>, MultiselectableProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGMultiselectable {...props} className={cn('', className)} />
    );
  }
);
Multiselectable.displayName = 'Multiselectable';

Object.assign(Multiselectable, TGMultiselectable);

'use client';

import * as React from 'react';
import { Multiselect as TGMultiselect } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type MultiselectProps = React.ComponentProps<typeof TGMultiselect>;

export const Multiselect = React.forwardRef<React.ElementRef<typeof TGMultiselect>, MultiselectProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGMultiselect ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Multiselect.displayName = 'Multiselect';

Object.assign(Multiselect, TGMultiselect);

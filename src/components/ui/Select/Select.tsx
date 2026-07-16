'use client';

import * as React from 'react';
import { Select as TGSelect } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SelectProps = React.ComponentProps<typeof TGSelect>;

export const Select = React.forwardRef<React.ElementRef<typeof TGSelect>, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSelect ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Select.displayName = 'Select';

Object.assign(Select, TGSelect);

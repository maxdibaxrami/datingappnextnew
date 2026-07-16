'use client';

import * as React from 'react';
import { Checkbox as TGCheckbox } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type CheckboxProps = React.ComponentProps<typeof TGCheckbox>;

export const Checkbox = React.forwardRef<React.ElementRef<typeof TGCheckbox>, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGCheckbox ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Checkbox.displayName = 'Checkbox';

Object.assign(Checkbox, TGCheckbox);

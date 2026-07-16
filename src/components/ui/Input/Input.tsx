'use client';

import * as React from 'react';
import { Input as TGInput } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type InputProps = React.ComponentProps<typeof TGInput>;

export const Input = React.forwardRef<React.ElementRef<typeof TGInput>, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGInput ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Input.displayName = 'Input';

Object.assign(Input, TGInput);

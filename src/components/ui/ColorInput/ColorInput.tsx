'use client';

import * as React from 'react';
import { ColorInput as TGColorInput } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type ColorInputProps = React.ComponentProps<typeof TGColorInput>;

export const ColorInput = React.forwardRef<React.ElementRef<typeof TGColorInput>, ColorInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGColorInput ref={ref} className={cn('', className)} {...props} />
    );
  }
);
ColorInput.displayName = 'ColorInput';

Object.assign(ColorInput, TGColorInput);

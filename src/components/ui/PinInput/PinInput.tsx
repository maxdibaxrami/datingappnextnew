'use client';

import * as React from 'react';
import { PinInput as TGPinInput } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type PinInputProps = React.ComponentProps<typeof TGPinInput>;

export const PinInput = React.forwardRef<React.ElementRef<typeof TGPinInput>, PinInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGPinInput ref={ref} className={cn('', className)} {...props} />
    );
  }
);
PinInput.displayName = 'PinInput';

Object.assign(PinInput, TGPinInput);

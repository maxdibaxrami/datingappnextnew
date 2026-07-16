'use client';

import * as React from 'react';
import { Button as TGButton } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type ButtonProps = React.ComponentProps<typeof TGButton>;

export const Button = React.forwardRef<React.ElementRef<typeof TGButton>, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGButton ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Button.displayName = 'Button';

Object.assign(Button, TGButton);

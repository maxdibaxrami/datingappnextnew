'use client';

import * as React from 'react';
import { Text as TGText } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type TextProps = React.ComponentProps<typeof TGText>;

export const Text = React.forwardRef<React.ElementRef<typeof TGText>, TextProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGText ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Text.displayName = 'Text';

Object.assign(Text, TGText);

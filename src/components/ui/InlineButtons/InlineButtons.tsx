'use client';

import * as React from 'react';
import { InlineButtons as TGInlineButtons } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type InlineButtonsProps = React.ComponentProps<typeof TGInlineButtons>;

export const InlineButtons = React.forwardRef<React.ElementRef<typeof TGInlineButtons>, InlineButtonsProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGInlineButtons ref={ref} className={cn('', className)} {...props} />
    );
  }
);
InlineButtons.displayName = 'InlineButtons';

Object.assign(InlineButtons, TGInlineButtons);

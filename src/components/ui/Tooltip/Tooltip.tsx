'use client';

import * as React from 'react';
import { Tooltip as TGTooltip } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type TooltipProps = React.ComponentProps<typeof TGTooltip>;

export const Tooltip = React.forwardRef<React.ElementRef<typeof TGTooltip>, TooltipProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGTooltip ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Tooltip.displayName = 'Tooltip';

Object.assign(Tooltip, TGTooltip);

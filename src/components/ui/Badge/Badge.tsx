'use client';

import * as React from 'react';
import { Badge as TGBadge } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type BadgeProps = React.ComponentProps<typeof TGBadge>;

export const Badge = React.forwardRef<React.ElementRef<typeof TGBadge>, BadgeProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGBadge ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Badge.displayName = 'Badge';

Object.assign(Badge, TGBadge);

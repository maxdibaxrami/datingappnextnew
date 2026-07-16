'use client';

import * as React from 'react';
import { Card as TGCard } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type CardProps = React.ComponentProps<typeof TGCard>;

export const Card = React.forwardRef<React.ElementRef<typeof TGCard>, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGCard ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Card.displayName = 'Card';

Object.assign(Card, TGCard);

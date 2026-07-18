'use client';

import * as React from 'react';
import { Selectable as TGSelectable } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SelectableProps = React.ComponentProps<typeof TGSelectable>;

export const Selectable = React.forwardRef<React.ElementRef<typeof TGSelectable>, SelectableProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSelectable ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Selectable.displayName = 'Selectable';

Object.assign(Selectable, TGSelectable);

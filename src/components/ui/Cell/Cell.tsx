'use client';

import * as React from 'react';
import { Cell as TGCell } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type CellProps = React.ComponentProps<typeof TGCell>;

export const Cell = React.forwardRef<React.ElementRef<typeof TGCell>, CellProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGCell ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Cell.displayName = 'Cell';

Object.assign(Cell, TGCell);

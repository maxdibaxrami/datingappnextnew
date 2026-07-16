'use client';

import * as React from 'react';
import { Chip as TGChip } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type ChipProps = React.ComponentProps<typeof TGChip>;

export const Chip = React.forwardRef<React.ElementRef<typeof TGChip>, ChipProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGChip ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Chip.displayName = 'Chip';

Object.assign(Chip, TGChip);

'use client';

import * as React from 'react';
import { Spoiler as TGSpoiler } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SpoilerProps = React.ComponentProps<typeof TGSpoiler>;

export const Spoiler = React.forwardRef<React.ElementRef<typeof TGSpoiler>, SpoilerProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSpoiler ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Spoiler.displayName = 'Spoiler';

Object.assign(Spoiler, TGSpoiler);

'use client';

import * as React from 'react';
import { Placeholder as TGPlaceholder } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type PlaceholderProps = React.ComponentProps<typeof TGPlaceholder>;

export const Placeholder = React.forwardRef<React.ElementRef<typeof TGPlaceholder>, PlaceholderProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGPlaceholder ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Placeholder.displayName = 'Placeholder';

Object.assign(Placeholder, TGPlaceholder);

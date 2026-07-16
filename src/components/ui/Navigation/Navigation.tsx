'use client';

import * as React from 'react';
import { Navigation as TGNavigation } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type NavigationProps = React.ComponentProps<typeof TGNavigation>;

export const Navigation = React.forwardRef<React.ElementRef<typeof TGNavigation>, NavigationProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGNavigation ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Navigation.displayName = 'Navigation';

Object.assign(Navigation, TGNavigation);

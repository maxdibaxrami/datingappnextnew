'use client';

import * as React from 'react';
import { Tabbar as TGTabbar } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type TabbarProps = React.ComponentProps<typeof TGTabbar>;

export const Tabbar = React.forwardRef<React.ElementRef<typeof TGTabbar>, TabbarProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGTabbar ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Tabbar.displayName = 'Tabbar';

Object.assign(Tabbar, TGTabbar);

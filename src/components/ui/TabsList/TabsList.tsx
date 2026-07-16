'use client';

import * as React from 'react';
import { TabsList as TGTabsList } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type TabsListProps = React.ComponentProps<typeof TGTabsList>;

export const TabsList = React.forwardRef<React.ElementRef<typeof TGTabsList>, TabsListProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGTabsList ref={ref} className={cn('', className)} {...props} />
    );
  }
);
TabsList.displayName = 'TabsList';

Object.assign(TabsList, TGTabsList);

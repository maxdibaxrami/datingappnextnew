'use client';

import * as React from 'react';
import { List as TGList } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type ListProps = React.ComponentProps<typeof TGList>;

export const List = React.forwardRef<React.ElementRef<typeof TGList>, ListProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGList ref={ref} className={cn('', className)} {...props} />
    );
  }
);
List.displayName = 'List';

Object.assign(List, TGList);

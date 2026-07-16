'use client';

import * as React from 'react';
import { CompactPagination as TGCompactPagination } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type CompactPaginationProps = React.ComponentProps<typeof TGCompactPagination>;

export const CompactPagination = React.forwardRef<React.ElementRef<typeof TGCompactPagination>, CompactPaginationProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGCompactPagination ref={ref} className={cn('', className)} {...props} />
    );
  }
);
CompactPagination.displayName = 'CompactPagination';

Object.assign(CompactPagination, TGCompactPagination);

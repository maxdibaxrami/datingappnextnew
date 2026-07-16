'use client';

import * as React from 'react';
import { Pagination as TGPagination } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type PaginationProps = React.ComponentProps<typeof TGPagination>;

export const Pagination = React.forwardRef<React.ElementRef<typeof TGPagination>, PaginationProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGPagination ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Pagination.displayName = 'Pagination';

Object.assign(Pagination, TGPagination);

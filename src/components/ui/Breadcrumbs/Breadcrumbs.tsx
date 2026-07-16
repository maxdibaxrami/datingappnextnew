'use client';

import * as React from 'react';
import { Breadcrumbs as TGBreadcrumbs } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type BreadcrumbsProps = React.ComponentProps<typeof TGBreadcrumbs>;

export const Breadcrumbs = React.forwardRef<React.ElementRef<typeof TGBreadcrumbs>, BreadcrumbsProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGBreadcrumbs ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Breadcrumbs.displayName = 'Breadcrumbs';

Object.assign(Breadcrumbs, TGBreadcrumbs);

'use client';

import * as React from 'react';
import { Skeleton as TGSkeleton } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SkeletonProps = React.ComponentProps<typeof TGSkeleton>;

export const Skeleton = React.forwardRef<React.ElementRef<typeof TGSkeleton>, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSkeleton ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Skeleton.displayName = 'Skeleton';

Object.assign(Skeleton, TGSkeleton);

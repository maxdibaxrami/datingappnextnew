'use client';

import * as React from 'react';
import { LargeTitle as TGLargeTitle } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type LargeTitleProps = React.ComponentProps<typeof TGLargeTitle>;

export const LargeTitle = React.forwardRef<React.ElementRef<typeof TGLargeTitle>, LargeTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGLargeTitle ref={ref} className={cn('', className)} {...props} />
    );
  }
);
LargeTitle.displayName = 'LargeTitle';

Object.assign(LargeTitle, TGLargeTitle);

'use client';

import * as React from 'react';
import { Title as TGTitle } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type TitleProps = React.ComponentProps<typeof TGTitle>;

export const Title = React.forwardRef<React.ElementRef<typeof TGTitle>, TitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGTitle ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Title.displayName = 'Title';

Object.assign(Title, TGTitle);

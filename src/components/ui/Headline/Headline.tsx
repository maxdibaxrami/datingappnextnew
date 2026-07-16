'use client';

import * as React from 'react';
import { Headline as TGHeadline } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type HeadlineProps = React.ComponentProps<typeof TGHeadline>;

export const Headline = React.forwardRef<React.ElementRef<typeof TGHeadline>, HeadlineProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGHeadline ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Headline.displayName = 'Headline';

Object.assign(Headline, TGHeadline);

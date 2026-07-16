'use client';

import * as React from 'react';
import { Timeline as TGTimeline } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type TimelineProps = React.ComponentProps<typeof TGTimeline>;

export const Timeline = React.forwardRef<React.ElementRef<typeof TGTimeline>, TimelineProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGTimeline ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Timeline.displayName = 'Timeline';

Object.assign(Timeline, TGTimeline);

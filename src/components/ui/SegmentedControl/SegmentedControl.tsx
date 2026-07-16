'use client';

import * as React from 'react';
import { SegmentedControl as TGSegmentedControl } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SegmentedControlProps = React.ComponentProps<typeof TGSegmentedControl>;

export const SegmentedControl = React.forwardRef<React.ElementRef<typeof TGSegmentedControl>, SegmentedControlProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSegmentedControl ref={ref} className={cn('', className)} {...props} />
    );
  }
);
SegmentedControl.displayName = 'SegmentedControl';

Object.assign(SegmentedControl, TGSegmentedControl);

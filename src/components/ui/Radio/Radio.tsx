'use client';

import * as React from 'react';
import { Radio as TGRadio } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type RadioProps = React.ComponentProps<typeof TGRadio>;

export const Radio = React.forwardRef<React.ElementRef<typeof TGRadio>, RadioProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGRadio ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Radio.displayName = 'Radio';

Object.assign(Radio, TGRadio);

'use client';

import * as React from 'react';
import { Caption as TGCaption } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type CaptionProps = React.ComponentProps<typeof TGCaption>;

export const Caption = React.forwardRef<React.ElementRef<typeof TGCaption>, CaptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGCaption ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Caption.displayName = 'Caption';

Object.assign(Caption, TGCaption);

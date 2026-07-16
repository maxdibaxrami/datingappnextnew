'use client';

import * as React from 'react';
import { Info as TGInfo } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type InfoProps = React.ComponentProps<typeof TGInfo>;

export const Info = React.forwardRef<React.ElementRef<typeof TGInfo>, InfoProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGInfo ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Info.displayName = 'Info';

Object.assign(Info, TGInfo);

'use client';

import * as React from 'react';
import { IconButton as TGIconButton } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type IconButtonProps = React.ComponentProps<typeof TGIconButton>;

export const IconButton = React.forwardRef<React.ElementRef<typeof TGIconButton>, IconButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGIconButton ref={ref} className={cn('', className)} {...props} />
    );
  }
);
IconButton.displayName = 'IconButton';

Object.assign(IconButton, TGIconButton);

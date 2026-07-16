'use client';

import * as React from 'react';
import { Snackbar as TGSnackbar } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SnackbarProps = React.ComponentProps<typeof TGSnackbar>;

export const Snackbar = React.forwardRef<React.ElementRef<typeof TGSnackbar>, SnackbarProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSnackbar ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Snackbar.displayName = 'Snackbar';

Object.assign(Snackbar, TGSnackbar);

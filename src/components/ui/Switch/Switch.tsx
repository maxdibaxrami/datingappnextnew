'use client';

import * as React from 'react';
import { Switch as TGSwitch } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SwitchProps = React.ComponentProps<typeof TGSwitch>;

export const Switch = React.forwardRef<React.ElementRef<typeof TGSwitch>, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSwitch ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Switch.displayName = 'Switch';

Object.assign(Switch, TGSwitch);

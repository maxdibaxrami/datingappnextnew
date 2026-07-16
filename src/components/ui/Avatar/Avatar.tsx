'use client';

import * as React from 'react';
import { Avatar as TGAvatar } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type AvatarProps = React.ComponentProps<typeof TGAvatar>;

export const Avatar = React.forwardRef<React.ElementRef<typeof TGAvatar>, AvatarProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGAvatar ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Avatar.displayName = 'Avatar';

Object.assign(Avatar, TGAvatar);

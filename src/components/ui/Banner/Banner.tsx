'use client';

import * as React from 'react';
import { Banner as TGBanner } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type BannerProps = React.ComponentProps<typeof TGBanner>;

export const Banner = React.forwardRef<React.ElementRef<typeof TGBanner>, BannerProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGBanner ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Banner.displayName = 'Banner';

Object.assign(Banner, TGBanner);

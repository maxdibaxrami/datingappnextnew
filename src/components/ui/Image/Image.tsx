'use client';

import * as React from 'react';
import { Image as TGImage } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type ImageProps = React.ComponentProps<typeof TGImage>;

export const Image = React.forwardRef<React.ElementRef<typeof TGImage>, ImageProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGImage ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Image.displayName = 'Image';

Object.assign(Image, TGImage);

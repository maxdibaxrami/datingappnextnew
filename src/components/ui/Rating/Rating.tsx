'use client';

import * as React from 'react';
import { Rating as TGRating } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type RatingProps = React.ComponentProps<typeof TGRating>;

export const Rating = React.forwardRef<React.ElementRef<typeof TGRating>, RatingProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGRating ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Rating.displayName = 'Rating';

Object.assign(Rating, TGRating);

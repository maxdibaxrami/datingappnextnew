'use client';

import * as React from 'react';
import { Slider as TGSlider } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SliderProps = React.ComponentProps<typeof TGSlider>;

export const Slider = React.forwardRef<React.ElementRef<typeof TGSlider>, SliderProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSlider ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Slider.displayName = 'Slider';

Object.assign(Slider, TGSlider);

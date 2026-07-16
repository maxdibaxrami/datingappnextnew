'use client';

import * as React from 'react';
import { Textarea as TGTextarea } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type TextareaProps = React.ComponentProps<typeof TGTextarea>;

export const Textarea = React.forwardRef<React.ElementRef<typeof TGTextarea>, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGTextarea ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Textarea.displayName = 'Textarea';

Object.assign(Textarea, TGTextarea);

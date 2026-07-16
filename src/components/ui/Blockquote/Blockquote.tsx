'use client';

import * as React from 'react';
import { Blockquote as TGBlockquote } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type BlockquoteProps = React.ComponentProps<typeof TGBlockquote>;

export const Blockquote = React.forwardRef<React.ElementRef<typeof TGBlockquote>, BlockquoteProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGBlockquote ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Blockquote.displayName = 'Blockquote';

Object.assign(Blockquote, TGBlockquote);

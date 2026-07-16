'use client';

import * as React from 'react';
import { Accordion as TGAccordion } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type AccordionProps = React.ComponentProps<typeof TGAccordion>;

export const Accordion = React.forwardRef<React.ElementRef<typeof TGAccordion>, AccordionProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGAccordion ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Accordion.displayName = 'Accordion';

Object.assign(Accordion, TGAccordion);

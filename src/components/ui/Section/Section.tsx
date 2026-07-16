'use client';

import * as React from 'react';
import { Section as TGSection } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type SectionProps = React.ComponentProps<typeof TGSection>;

export const Section = React.forwardRef<React.ElementRef<typeof TGSection>, SectionProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGSection ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Section.displayName = 'Section';

Object.assign(Section, TGSection);

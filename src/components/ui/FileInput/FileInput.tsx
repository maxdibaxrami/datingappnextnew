'use client';

import * as React from 'react';
import { FileInput as TGFileInput } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type FileInputProps = React.ComponentProps<typeof TGFileInput>;

export const FileInput = React.forwardRef<React.ElementRef<typeof TGFileInput>, FileInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGFileInput ref={ref} className={cn('', className)} {...props} />
    );
  }
);
FileInput.displayName = 'FileInput';

Object.assign(FileInput, TGFileInput);

'use client';

import * as React from 'react';
import { Modal as TGModal } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type ModalProps = React.ComponentProps<typeof TGModal>;

export const Modal = React.forwardRef<React.ElementRef<typeof TGModal>, ModalProps>(
  ({ className, ...props }, ref) => {
    return (
      <TGModal ref={ref} className={cn('', className)} {...props} />
    );
  }
);
Modal.displayName = 'Modal';

Object.assign(Modal, TGModal);

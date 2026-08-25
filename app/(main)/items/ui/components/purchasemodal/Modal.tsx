'use client';

import { useIsClient } from '@/app/ui/hooks/useIsClient';
import { createPortal } from 'react-dom';
import { CloseButton } from '@/app/ui/components/button';
import './modal.css';

export default function Modal({
  children,
  className,
  onClose,
}: {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  const mounted = useIsClient();
  if (!mounted) return null;

  // Portaled to document.body so the fixed overlay escapes ancestor scroll
  // containers and stacking contexts — iOS WebKit composites the items scroll
  // container into its own layer and paints positioned siblings (hero,
  // toolbar, pagination) above an inline fixed overlay regardless of z-index.
  return createPortal(
    <div className={`modal-overlay ${className || ''}`}>
      <div className="modal-container">
        <div className="modal">
          <CloseButton onClick={onClose} />
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

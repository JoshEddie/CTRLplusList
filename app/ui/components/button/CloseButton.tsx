import { ButtonHTMLAttributes, forwardRef } from 'react';
import { LuX } from 'react-icons/lu';

type CloseButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label'
> & {
  /** Accessible name; defaults to "Close". */
  label?: string;
};

// The one close affordance for floating surfaces (modals, deck screens,
// overlay menus): a 36px disc inset inside the surface's top-right corner
// (the surface provides the positioning context), white fill with a
// primary-dark outline and x. Pass className only for a per-surface layout
// pivot, never to restyle the disc.
export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(
  function CloseButton({ label = 'Close', className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={['close-button', className].filter(Boolean).join(' ')}
        aria-label={label}
        {...rest}
      >
        <LuX aria-hidden />
      </button>
    );
  }
);

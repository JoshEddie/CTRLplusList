import { ButtonHTMLAttributes, forwardRef } from 'react';
import { buttonClasses } from './buttonClasses';
import type { ButtonSize, ButtonVariant, ButtonWidth } from './types';

type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed'
> & {
  variant: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
  isLoading?: boolean;
  pressed?: boolean;
  width?: ButtonWidth
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant,
      size,
      width,
      icon,
      isLoading,
      pressed,
      className,
      disabled,
      children,
      type = 'button',
      ...rest
    },
    ref
  ) {
    const composed = buttonClasses({ variant, size, width, icon, extra: className });

    return (
      <button
        ref={ref}
        type={type}
        className={composed}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        aria-pressed={pressed === undefined ? undefined : pressed}
        {...rest}
      >
        {isLoading ? (
          <>
            <span className="btn-spinner" aria-hidden="true" />
            <span className="sr-only">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

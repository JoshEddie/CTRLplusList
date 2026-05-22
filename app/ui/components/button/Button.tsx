import { ButtonHTMLAttributes, forwardRef } from 'react';
import { buttonClasses } from './buttonClasses';
import type { ButtonSize, ButtonVariant } from './types';

type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed'
> & {
  variant: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  pressed?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant,
      size,
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
    const composed = buttonClasses({ variant, size, extra: className });

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
        {isLoading && <span className="btn-spinner" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

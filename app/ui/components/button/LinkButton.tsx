import Link, { LinkProps } from 'next/link';
import { AnchorHTMLAttributes, forwardRef } from 'react';
import { buttonClasses } from './buttonClasses';
import type { ButtonSize, ButtonVariant } from './types';

type LinkButtonProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof LinkProps | 'aria-pressed'
> &
  LinkProps & {
    variant: ButtonVariant;
    size?: ButtonSize;
    pressed?: boolean;
    children?: React.ReactNode;
  };

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  function LinkButton(
    { variant, size, pressed, className, children, ...rest },
    ref,
  ) {
    const composed = buttonClasses({ variant, size, extra: className });

    return (
      <Link
        ref={ref}
        className={composed}
        aria-pressed={pressed === undefined ? undefined : pressed}
        {...rest}
      >
        {children}
      </Link>
    );
  },
);

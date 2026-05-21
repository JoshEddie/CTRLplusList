import Link, { LinkProps } from 'next/link';
import { AnchorHTMLAttributes, forwardRef, ReactNode } from 'react';
import { menuItemClasses } from './menuClasses';
import type { MenuItemTone } from './types';

type MenuLinkItemProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof LinkProps
> &
  LinkProps & {
    icon?: ReactNode;
    tone?: MenuItemTone;
    children?: ReactNode;
  };

export const MenuLinkItem = forwardRef<HTMLAnchorElement, MenuLinkItemProps>(
  function MenuLinkItem({ icon, tone, className, children, ...rest }, ref) {
    return (
      <Link
        ref={ref}
        role="menuitem"
        className={menuItemClasses({ tone, extra: className })}
        {...rest}
      >
        {icon}
        {children}
      </Link>
    );
  },
);

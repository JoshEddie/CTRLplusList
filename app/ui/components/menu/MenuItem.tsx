import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { menuItemClasses } from './menuClasses';
import type { MenuItemTone } from './types';

type MenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  tone?: MenuItemTone;
};

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  function MenuItem(
    { icon, tone, className, children, type = 'button', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        role="menuitem"
        className={menuItemClasses({ tone, extra: className })}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  },
);

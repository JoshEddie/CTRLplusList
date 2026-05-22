import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

type MenuItemRadioProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onSelect' | 'aria-checked'
> & {
  icon?: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onSelect: () => void;
};

export const MenuItemRadio = forwardRef<HTMLButtonElement, MenuItemRadioProps>(
  function MenuItemRadio(
    {
      icon,
      description,
      checked,
      onSelect,
      className,
      children,
      type = 'button',
      onClick,
      ...rest
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        role="menuitemradio"
        aria-checked={checked}
        className={['menu-item', 'menu-item-radio', className]
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) onSelect();
        }}
        {...rest}
      >
        {icon ? <span className="menu-item-radio__icon">{icon}</span> : null}
        <span className="menu-item-radio__body">
          <span className="menu-item-radio__label">{children}</span>
          {description ? (
            <span className="menu-item-radio__description">{description}</span>
          ) : null}
        </span>
        <span className="menu-item-radio__indicator" aria-hidden>
          {checked ? '✓' : ''}
        </span>
      </button>
    );
  }
);

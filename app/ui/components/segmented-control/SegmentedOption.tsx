'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { segmentedOptionClasses } from './segmentedClasses';
import { useSegmentedContext } from './SegmentedControl';

type SegmentedOptionProps<T extends string> = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'onChange' | 'aria-checked'
> & {
  value: T;
  children: ReactNode;
};

function SegmentedOptionInner<T extends string>(
  { value, children, className, ...rest }: SegmentedOptionProps<T>,
  ref: React.Ref<HTMLButtonElement>
) {
  const ctx = useSegmentedContext();
  const isActive = ctx.value === value;
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isActive}
      tabIndex={isActive ? 0 : -1}
      data-value={value}
      className={segmentedOptionClasses({
        active: isActive,
        extra: className,
      })}
      onClick={() => ctx.onChange(value)}
      {...rest}
    >
      {children}
    </button>
  );
}

export const SegmentedOption = forwardRef(SegmentedOptionInner) as <
  T extends string,
>(
  props: SegmentedOptionProps<T> & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof SegmentedOptionInner>;

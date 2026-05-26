import { forwardRef } from 'react';
import { triggerClasses } from './triggerClasses';
import type { PopoverTriggerProps } from './types';
import './popover-trigger.css';

export const PopoverTrigger = forwardRef<
  HTMLButtonElement,
  PopoverTriggerProps
>(function PopoverTrigger(
  { icon, label, count, active, tone, className, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={triggerClasses({ active, tone, extra: className })}
      {...rest}
    >
      {icon}
      <span className="popover-trigger-label">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="popover-trigger-count">{count}</span>
      )}
      <svg
        className="popover-trigger-chevron"
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M1 1l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
});

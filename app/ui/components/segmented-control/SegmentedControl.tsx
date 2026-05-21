'use client';

import {
  AriaAttributes,
  createContext,
  forwardRef,
  ReactNode,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { segmentedGroupClasses } from './segmentedClasses';
import type { SegmentedTone } from './types';
import './segmented-control.css';

// React context kept generic via `unknown` then narrowed at the option call site
// — generic forwardRef + context together don't compose cleanly in TS.
interface SegmentedContextValue {
  value: unknown;
  onChange: (value: unknown) => void;
  tone: SegmentedTone;
}

const SegmentedContext = createContext<SegmentedContextValue | null>(null);

export function useSegmentedContext(): SegmentedContextValue {
  const ctx = useContext(SegmentedContext);
  if (!ctx) {
    throw new Error(
      '<SegmentedOption> must be rendered inside a <SegmentedControl>',
    );
  }
  return ctx;
}

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  tone: SegmentedTone;
  children: ReactNode;
  className?: string;
} & Pick<AriaAttributes, 'aria-label' | 'aria-labelledby'>;

function SegmentedControlInner<T extends string>(
  { value, onChange, tone, children, className, ...aria }: SegmentedControlProps<T>,
  ref: React.Ref<HTMLDivElement>,
) {
  const localRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  useEffect(() => {
    const container = localRef.current;
    if (!container) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key !== 'ArrowLeft' &&
        e.key !== 'ArrowRight' &&
        e.key !== 'ArrowUp' &&
        e.key !== 'ArrowDown'
      ) {
        return;
      }
      const options = Array.from(
        container.querySelectorAll<HTMLElement>('[role="radio"]'),
      );
      if (options.length === 0) return;
      const currentIndex = options.findIndex(
        (o) => o.getAttribute('aria-checked') === 'true',
      );
      const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
      const nextIndex = forward
        ? (currentIndex + 1) % options.length
        : (currentIndex - 1 + options.length) % options.length;
      const next = options[nextIndex];
      const nextValue = next?.dataset.value;
      if (nextValue === undefined) return;
      e.preventDefault();
      (onChange as (v: unknown) => void)(nextValue);
      next.focus();
    };
    container.addEventListener('keydown', onKey);
    return () => container.removeEventListener('keydown', onKey);
  }, [onChange]);

  return (
    <SegmentedContext.Provider
      value={{
        value,
        onChange: onChange as (v: unknown) => void,
        tone,
      }}
    >
      <div
        ref={localRef}
        role="radiogroup"
        className={segmentedGroupClasses({ tone, extra: className })}
        {...aria}
      >
        {children}
      </div>
    </SegmentedContext.Provider>
  );
}

export const SegmentedControl = forwardRef(SegmentedControlInner) as <
  T extends string,
>(
  props: SegmentedControlProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => ReturnType<typeof SegmentedControlInner>;

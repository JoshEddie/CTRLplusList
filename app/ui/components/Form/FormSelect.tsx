'use client';

import { OptionType } from '@/lib/types';
import dynamic from 'next/dynamic';

// react-select is not SSR-safe (auto-incrementing internal IDs cause hydration
// mismatches), so it's loaded via `dynamic({ ssr: false })`. Next renders the
// `loading` fallback on both server and initial client hydration, then swaps
// in the real component after mount — no manual isClient gate needed.
const Select = dynamic(() => import('react-select'), {
  ssr: false,
  loading: () => <div className="react-select" aria-hidden="true" />,
});

interface FormSelectProps {
  options: OptionType[];
  name: string;
  className?: string;
  onChange: (value: OptionType | OptionType[] | null) => void;
  isPending?: boolean;
  placeholder?: string;
  isMulti?: boolean;
  defaultValue?: OptionType | OptionType[];
  isClearable?: boolean;
}

export default function FormSelect({
  name,
  className = 'react-select',
  onChange,
  options,
  isPending,
  placeholder,
  isMulti,
  defaultValue,
  isClearable = true,
}: FormSelectProps) {
  return (
    <Select
      instanceId={name}
      name={name}
      className={className}
      classNamePrefix="react-select"
      options={options}
      onChange={(e) => {
        onChange(Array.isArray(e) ? e : e ? [e] : null);
      }}
      isDisabled={isPending}
      placeholder={placeholder}
      isClearable={isClearable}
      isSearchable={true}
      autoFocus={false}
      isMulti={isMulti}
      hideSelectedOptions={isMulti}
      defaultValue={defaultValue}
    />
  );
}

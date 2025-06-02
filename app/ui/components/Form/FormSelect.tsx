'use client';

import { OptionType } from '@/lib/types';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Select = dynamic(() => import('react-select'), {
  ssr: false,
  loading: () => <div className="react-select">Loading...</div>,
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="react-select" aria-hidden="true" />;
  }

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

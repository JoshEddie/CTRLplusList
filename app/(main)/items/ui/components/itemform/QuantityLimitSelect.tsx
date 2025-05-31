// QuantityLimitSelect.tsx
'use client';

import { FormGroup, FormLabel } from '@/app/ui/components/Form/Form';
import FormSelect from '@/app/ui/components/Form/FormSelect';
import SelectWrapper from '@/app/ui/components/SelectWrapper';
import TooltipWrapper from '@/app/ui/components/TooltipWrapper';
import { OptionType } from '@/lib/types';

interface QuantityLimitSelectProps {
  options: OptionType[];
  name: string;
  onChange: (value: OptionType | OptionType[] | null) => void;
  isPending?: boolean;
  placeholder?: string;
  isMulti?: boolean;
  defaultValue?: OptionType | OptionType[];
  isClearable?: boolean;
  error?: string;
}

export function QuantityLimitSelect({
  name,
  onChange,
  options,
  isPending,
  placeholder,
  isMulti,
  defaultValue,
  isClearable = true,
  error = '',
}: QuantityLimitSelectProps) {
  return (
    <FormGroup>
      <FormLabel>Quantity Limit</FormLabel>
      <TooltipWrapper
        className={`input-tooltip ${error ? 'form-error' : ''}`}
        tooltip={error}
      >
        <SelectWrapper>
          <FormSelect
            name={name}
            options={options}
            defaultValue={defaultValue}
            onChange={onChange}
            isPending={isPending}
            placeholder={placeholder}
            isMulti={isMulti}
            className={error ? 'form-input-error' : ''}
            isClearable={isClearable}
          />
        </SelectWrapper>
      </TooltipWrapper>
    </FormGroup>
  );
}

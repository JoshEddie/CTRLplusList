import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuantityLimitField } from '../QuantityLimitField';

const number = () => screen.getByLabelText('Quantity Limit');
const unlimited = () => screen.getByLabelText('Unlimited');

describe('QuantityLimitField', () => {
  it('NumberValue_ShowsNumber-UnlimitedUnchecked', () => {
    render(<QuantityLimitField value={3} onChange={vi.fn()} />);
    expect(number()).toHaveValue(3);
    expect(unlimited()).not.toBeChecked();
    expect(number()).not.toBeDisabled();
  });

  it('NullValue_ShowsEmpty-UnlimitedChecked-NumberDisabled', () => {
    render(<QuantityLimitField value={null} onChange={vi.fn()} />);
    expect(number()).toHaveValue(null);
    expect(unlimited()).toBeChecked();
    expect(number()).toBeDisabled();
  });

  it('CheckUnlimited_CallsOnChangeNull', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityLimitField value={3} onChange={onChange} />);
    await user.click(unlimited());
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('UncheckUnlimited_CallsOnChangeOne', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityLimitField value={null} onChange={onChange} />);
    await user.click(unlimited());
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('TypePositiveNumber_CallsOnChangeParsed', () => {
    const onChange = vi.fn();
    render(<QuantityLimitField value={1} onChange={onChange} />);
    fireEvent.change(number(), { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('ClearNumber_CallsOnChangeOne', () => {
    const onChange = vi.fn();
    render(<QuantityLimitField value={2} onChange={onChange} />);
    fireEvent.change(number(), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('ZeroOrInvalid_DoesNotCallOnChange', () => {
    const onChange = vi.fn();
    render(<QuantityLimitField value={2} onChange={onChange} />);
    fireEvent.change(number(), { target: { value: '0' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Pending_DisablesUnlimitedToggle', () => {
    render(<QuantityLimitField value={3} onChange={vi.fn()} isPending />);
    expect(unlimited()).toBeDisabled();
    expect(number()).toBeDisabled();
  });
});

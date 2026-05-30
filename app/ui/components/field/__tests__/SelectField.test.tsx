/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * SelectField wraps a native <select> in <FormField>. Container queries are
 * the only way to reach the .form_field chrome div for size-class assertions
 * and to confirm the select's class composition.
 */
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SelectField } from '../SelectField';

const OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

describe('SelectField', () => {
  describe('DomShape', () => {
    it('Default_RendersSelectInsideFormField', () => {
      const { container } = render(
        <SelectField name="sort" options={OPTIONS} />
      );
      const select = container.querySelector(
        '.form_field_group > .form_field > .form_field_select'
      ) as HTMLSelectElement;
      expect(select).not.toBeNull();
      expect(select.tagName).toBe('SELECT');
      expect(select).toHaveAttribute('name', 'sort');
    });
  });

  describe('OptionsAndChildren', () => {
    it('Options_RenderedAsOptionElements', () => {
      render(<SelectField label="Sort" options={OPTIONS} />);
      const select = screen.getByLabelText('Sort') as HTMLSelectElement;
      const optionEls = select.querySelectorAll('option');
      expect(optionEls).toHaveLength(2);
      expect(optionEls[0]).toHaveAttribute('value', 'a');
      expect(optionEls[0].textContent).toBe('A');
      expect(optionEls[1]).toHaveAttribute('value', 'b');
      expect(optionEls[1].textContent).toBe('B');
    });

    it('ChildrenPath_NoOptionsProvided', () => {
      render(
        <SelectField label="Sort">
          <option value="x">X</option>
        </SelectField>
      );
      const select = screen.getByLabelText('Sort') as HTMLSelectElement;
      const opt = select.querySelector('option[value="x"]') as HTMLOptionElement;
      expect(opt).not.toBeNull();
      expect(opt.textContent).toBe('X');
    });

    it('OptionsTakePriorityOverChildren_IfBoth', () => {
      render(
        <SelectField label="Sort" options={OPTIONS}>
          <option value="x">X</option>
        </SelectField>
      );
      const select = screen.getByLabelText('Sort') as HTMLSelectElement;
      expect(select.querySelector('option[value="a"]')).not.toBeNull();
      expect(select.querySelector('option[value="b"]')).not.toBeNull();
      expect(select.querySelector('option[value="x"]')).toBeNull();
    });
  });

  describe('FieldSizeForwarding', () => {
    it('FieldSizeSm_ForwardsToFormFieldSize', () => {
      const { container } = render(
        <SelectField fieldSize="sm" options={OPTIONS} />
      );
      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field).toHaveClass('form_field-sm');
    });

    it('FieldSizeOmitted_NoSmClass', () => {
      const { container } = render(<SelectField options={OPTIONS} />);
      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field).not.toHaveClass('form_field-sm');
    });
  });

  describe('PropPassthrough', () => {
    it('DisabledTrue_ForwardedToSelect', () => {
      render(<SelectField label="Sort" options={OPTIONS} disabled />);
      expect(screen.getByLabelText('Sort')).toBeDisabled();
    });
  });

  describe('RefForwarding', () => {
    it('Ref_ResolvesToSelectElement', () => {
      const ref = createRef<HTMLSelectElement>();
      render(<SelectField ref={ref} options={OPTIONS} />);
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
      expect(ref.current).toHaveClass('form_field_select');
    });
  });

  describe('WrapperForwarding', () => {
    it('LabelErrorRequiredIcon_ForwardedToFormField', () => {
      const { container } = render(
        <SelectField
          label="Sort"
          error="Required"
          required
          icon={<svg data-testid="i" />}
          options={OPTIONS}
        />
      );
      expect(container.querySelector('.form_field_label')?.textContent).toMatch(
        /Sort/
      );
      expect(container.querySelector('.field_error')?.textContent).toBe(
        'Required'
      );
      const select = screen.getByLabelText(/Sort/);
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(select).toHaveAttribute('aria-required', 'true');
      expect(
        container.querySelector('.form_field [data-testid="i"]')
      ).not.toBeNull();
    });

    it('ClassNameForwarded_AppendsToOuterGroup', () => {
      const { container } = render(
        <SelectField className="layout-extra" options={OPTIONS} />
      );
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).toHaveClass('form_field_group', 'layout-extra');
    });
  });
});

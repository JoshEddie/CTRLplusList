/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * DateField wraps a native <input type="date"> in <FormField>. Container
 * queries assert on the wrapping chrome and the input's class composition.
 */
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DateField } from '../DateField';

describe('DateField', () => {
  describe('DomShape', () => {
    it('Default_RendersDateInputInsideFormField', () => {
      const { container } = render(<DateField name="d" />);
      const input = container.querySelector(
        '.form_field_group > .form_field > .form_field_input'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toHaveAttribute('type', 'date');
    });
  });

  describe('PropPassthrough', () => {
    it('MinMax_Forwarded', () => {
      const { container } = render(
        <DateField min="1900-01-01" max="2100-12-31" />
      );
      const input = container.querySelector(
        '.form_field_input'
      ) as HTMLInputElement;
      expect(input).toHaveAttribute('min', '1900-01-01');
      expect(input).toHaveAttribute('max', '2100-12-31');
    });

    it('DisabledTrue_ForwardedToInput', () => {
      render(<DateField label="When" disabled />);
      expect(screen.getByLabelText('When')).toBeDisabled();
    });
  });

  describe('RefForwarding', () => {
    it('Ref_ResolvesToInputElement', () => {
      const ref = createRef<HTMLInputElement>();
      render(<DateField ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveClass('form_field_input');
      expect(ref.current).toHaveAttribute('type', 'date');
    });
  });

  describe('WrapperForwarding', () => {
    it('LabelErrorRequiredIcon_ForwardedToFormField', () => {
      const { container } = render(
        <DateField
          label="When"
          error="Required"
          required
          icon={<svg data-testid="i" />}
        />
      );
      expect(container.querySelector('.form_field_label')?.textContent).toMatch(
        /When/
      );
      expect(container.querySelector('.field_error')?.textContent).toBe(
        'Required'
      );
      const input = screen.getByLabelText(/When/);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(
        container.querySelector('.form_field [data-testid="i"]')
      ).not.toBeNull();
    });

    it('ClassNameForwarded_AppendsToOuterGroup', () => {
      const { container } = render(<DateField className="layout-extra" />);
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).toHaveClass('form_field_group', 'layout-extra');
    });
  });
});

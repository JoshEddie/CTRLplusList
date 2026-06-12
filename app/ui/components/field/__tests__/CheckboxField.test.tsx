/* eslint-disable testing-library/no-node-access --
 * CheckboxField renders a `<label>` wrapping a native `<input type="checkbox">`
 * and a `<span>` for the text. The label carries no role; direct firstChild
 * + querySelector access is required to assert label-class composition and
 * the `<span>` label-text placement.
 */
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CheckboxField } from '../CheckboxField';

describe('CheckboxField', () => {
  describe('DomShape', () => {
    it('Default_RendersLabelWrappingCheckboxAndSpan', () => {
      const { container } = render(
        <CheckboxField name="agree" label="I agree" />
      );
      const label = container.firstChild as HTMLLabelElement;
      expect(label.tagName).toBe('LABEL');
      expect(label).toHaveClass('checkbox_field');

      const input = label.querySelector('input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.type).toBe('checkbox');
      expect(input).toHaveClass('checkbox_field_box');
      expect(input).toHaveAttribute('name', 'agree');

      const span = label.querySelector('span') as HTMLSpanElement;
      expect(span).not.toBeNull();
      expect(span.textContent).toBe('I agree');
    });
  });

  describe('ClassNameComposition', () => {
    it('ClassNameProvided_AppendedToLabelClass', () => {
      const { container } = render(
        <CheckboxField label="x" className="extra" />
      );
      const label = container.firstChild as HTMLLabelElement;
      expect(label.className).toBe('checkbox_field extra');
    });

    it('ClassNameOmitted_NoTrailingSpace', () => {
      const { container } = render(<CheckboxField label="x" />);
      const label = container.firstChild as HTMLLabelElement;
      expect(label.className).toBe('checkbox_field');
    });
  });

  describe('PropPassthrough', () => {
    it('CheckedTrue_InputChecked', () => {
      render(<CheckboxField label="x" checked onChange={() => {}} />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('Clicked_FiresOnChange', async () => {
      const spy = vi.fn();
      render(<CheckboxField label="x" onChange={spy} />);
      await userEvent.click(screen.getByRole('checkbox'));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('DisabledTrue_InputDisabled', () => {
      render(<CheckboxField label="x" disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('NameForwarded_ToInput', () => {
      render(<CheckboxField label="x" name="agree" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('name', 'agree');
    });
  });

  describe('RefForwarding', () => {
    it('Ref_ResolvesToInputElement', () => {
      const ref = createRef<HTMLInputElement>();
      render(<CheckboxField label="x" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveClass('checkbox_field_box');
      expect(ref.current?.type).toBe('checkbox');
    });
  });
});

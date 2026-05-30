/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * TextField wraps a native <input> inside <FormField>. We assert on the
 * input's class composition and on the outer .form_field_group chrome — both
 * structural concerns the wrapper owns. Role-based queries reach the input
 * but not the chrome containers, so container queries are used for the
 * outer-wrapper assertions only.
 */
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from '../TextField';

const TEXT_TYPES = [
  'text',
  'email',
  'url',
  'tel',
  'password',
  'search',
  'number',
] as const;

describe('TextField', () => {
  describe('DomShape', () => {
    it('Default_RendersInputInsideFormField', () => {
      const { container } = render(<TextField label="Name" name="name" />);
      const input = container.querySelector(
        '.form_field_group > .form_field > .form_field_input'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.type).toBe('text');
      expect(input).toHaveAttribute('name', 'name');
    });
  });

  describe('TypeProp', () => {
    it('TypeDefault_Text', () => {
      const { container } = render(<TextField />);
      const input = container.querySelector(
        '.form_field_input'
      ) as HTMLInputElement;
      expect(input.type).toBe('text');
    });

    it.each(TEXT_TYPES)('TypeSetTo_%s', (type) => {
      const { container } = render(<TextField type={type} />);
      const input = container.querySelector(
        '.form_field_input'
      ) as HTMLInputElement;
      expect(input.type).toBe(type);
    });
  });

  describe('PropPassthrough', () => {
    it('Placeholder_ForwardedToInput', () => {
      render(<TextField placeholder="Enter title" />);
      expect(screen.getByPlaceholderText('Enter title')).toHaveAttribute(
        'placeholder',
        'Enter title'
      );
    });

    it('ValueAndOnChange_Forwarded', async () => {
      function Wrapper() {
        return <TextField defaultValue="abc" onChange={spy} />;
      }
      const spy = vi.fn();
      render(<Wrapper />);
      const input = screen.getByDisplayValue('abc');
      await userEvent.type(input, 'd');
      expect(spy).toHaveBeenCalled();
      // last call should be a synthetic change event
      const lastCall = spy.mock.calls.at(-1) as unknown[];
      expect(lastCall[0]).toMatchObject({ target: expect.any(HTMLInputElement) });
    });

    it('DisabledTrue_ForwardedToInput', () => {
      render(<TextField label="Name" disabled />);
      expect(screen.getByLabelText('Name')).toBeDisabled();
    });

    it('DisabledOmitted_InputNotDisabled', () => {
      render(<TextField label="Name" />);
      expect(screen.getByLabelText('Name')).not.toBeDisabled();
    });
  });

  describe('RefForwarding', () => {
    it('Ref_ResolvesToInputElement', () => {
      const ref = createRef<HTMLInputElement>();
      render(<TextField ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveClass('form_field_input');
    });
  });

  describe('WrapperForwarding', () => {
    it('LabelForwarded_ToFormField', () => {
      const { container } = render(<TextField label="Name" />);
      const label = container.querySelector(
        '.form_field_label'
      ) as HTMLLabelElement;
      expect(label).not.toBeNull();
      expect(label.textContent).toBe('Name');
    });

    it('ErrorForwarded_RendersFieldError', () => {
      const { container } = render(
        <TextField label="Name" error="Required" />
      );
      const fieldError = container.querySelector(
        '.field_error'
      ) as HTMLParagraphElement;
      expect(fieldError).not.toBeNull();
      expect(fieldError.textContent).toBe('Required');
      expect(screen.getByLabelText('Name')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });

    it('RequiredForwarded_AriaRequiredOnInput', () => {
      render(<TextField label="Name" required />);
      expect(screen.getByLabelText(/Name/)).toHaveAttribute(
        'aria-required',
        'true'
      );
    });

    it('IconForwarded_AppearsInFieldRow', () => {
      const { container } = render(
        <TextField icon={<svg data-testid="i" />} />
      );
      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field.querySelector('[data-testid="i"]')).not.toBeNull();
    });

    it('ClassNameForwarded_AppendsToOuterGroup', () => {
      const { container } = render(<TextField className="layout-extra" />);
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).toHaveClass('form_field_group', 'layout-extra');
    });
  });
});

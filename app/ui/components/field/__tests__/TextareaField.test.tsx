/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * TextareaField wraps a native <textarea> inside <FormField>. The wrapping
 * chrome divs carry no role/label; container queries are required to assert
 * their composition and the textarea's class string.
 */
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextareaField } from '../TextareaField';

describe('TextareaField', () => {
  describe('DomShape', () => {
    it('Default_RendersTextareaInsideFormField', () => {
      const { container } = render(
        <TextareaField name="notes" rows={4} />
      );
      const textarea = container.querySelector(
        '.form_field_group > .form_field > .form_field_textarea'
      ) as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(textarea).toHaveAttribute('name', 'notes');
      expect(textarea).toHaveAttribute('rows', '4');
    });
  });

  describe('PropPassthrough', () => {
    it('DisabledTrue_ForwardedToTextarea', () => {
      render(<TextareaField label="Notes" disabled />);
      expect(screen.getByLabelText('Notes')).toBeDisabled();
    });

    it('DisabledOmitted_NotDisabled', () => {
      render(<TextareaField label="Notes" />);
      expect(screen.getByLabelText('Notes')).not.toBeDisabled();
    });

    it('ValueAndOnChange_Forwarded', async () => {
      const spy = vi.fn();
      render(<TextareaField label="Notes" defaultValue="abc" onChange={spy} />);
      const textarea = screen.getByLabelText('Notes') as HTMLTextAreaElement;
      expect(textarea.value).toBe('abc');
      await userEvent.type(textarea, 'd');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('RefForwarding', () => {
    it('Ref_ResolvesToTextareaElement', () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<TextareaField ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
      expect(ref.current).toHaveClass('form_field_textarea');
    });
  });

  describe('WrapperForwarding', () => {
    it('LabelErrorRequiredIcon_ForwardedToFormField', () => {
      const { container } = render(
        <TextareaField
          label="Notes"
          error="Required"
          required
          icon={<svg data-testid="i" />}
        />
      );
      const label = container.querySelector(
        '.form_field_label'
      ) as HTMLLabelElement;
      expect(label.textContent).toMatch(/Notes/);

      const fieldError = container.querySelector(
        '.field_error'
      ) as HTMLParagraphElement;
      expect(fieldError.textContent).toBe('Required');

      const textarea = screen.getByLabelText(/Notes/);
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
      expect(textarea).toHaveAttribute('aria-required', 'true');

      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field.querySelector('[data-testid="i"]')).not.toBeNull();
    });

    it('ClassNameForwarded_AppendsToOuterGroup', () => {
      const { container } = render(
        <TextareaField className="layout-extra" />
      );
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).toHaveClass('form_field_group', 'layout-extra');
    });
  });
});

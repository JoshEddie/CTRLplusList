/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * FormField owns chrome composition on the wrapping `.form_field_group` and
 * `.form_field` divs and on injected aria-* attributes on the cloned child.
 * The chrome wrapper carries no role/label, so role-based queries cannot
 * reach it; `container.firstChild` and `.form_field_*` selectors are the
 * only way to assert outer-class composition, icon-position grid, and
 * required-indicator span shape. AT-observable attributes on the input
 * (aria-required / aria-invalid / aria-describedby / type) are still
 * asserted via role-based queries.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormField } from '../FormField';
import { TextField } from '../TextField';

describe('FormField', () => {
  describe('ChildSingleton', () => {
    it('ZeroChildren_ChildrenOnlyThrows', () => {
      expect(() => render(<FormField label="x">{null}</FormField>)).toThrow();
    });

    it('MultipleChildren_ChildrenOnlyThrows', () => {
      expect(() =>
        render(
          <FormField label="x">
            <input />
            <input />
          </FormField>
        )
      ).toThrow();
    });
  });

  describe('DevWarningOnUnknownChild', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      errorSpy.mockRestore();
    });

    it('UnknownDisplayName_ConsoleErrorIsCalled', () => {
      function MyField() {
        return <input />;
      }
      MyField.displayName = 'MyField';

      render(
        <FormField label="x">
          <MyField />
        </FormField>
      );

      const wrapperWarnings = errorSpy.mock.calls.filter(
        (args: unknown[]) =>
          typeof args[0] === 'string' &&
          args[0].includes('<MyField>') &&
          args[0].includes('field-type wrapper')
      );
      expect(wrapperWarnings).toHaveLength(1);
    });

    it('KnownDisplayName_ConsoleErrorNotCalled', () => {
      render(
        <FormField label="x">
          <TextField />
        </FormField>
      );
      const wrapperWarnings = errorSpy.mock.calls.filter(
        (args: unknown[]) =>
          typeof args[0] === 'string' &&
          args[0].includes('field-type wrapper')
      );
      expect(wrapperWarnings).toHaveLength(0);
    });

    it('AnonymousChild_ConsoleErrorNotCalled', () => {
      render(
        <FormField label="x">
          <input />
        </FormField>
      );
      const wrapperWarnings = errorSpy.mock.calls.filter(
        (args: unknown[]) =>
          typeof args[0] === 'string' &&
          args[0].includes('field-type wrapper')
      );
      expect(wrapperWarnings).toHaveLength(0);
    });
  });

  // The UseIdWiring tests assert on attributes that <FormField> injects via
  // cloneElement onto its single child. Nesting <TextField/> as the child
  // would double-wrap (TextField has its own internal <FormField>) and the
  // inner clone overrides the outer's injected id/aria-*. Tests use a bare
  // <input/> so the cloned attrs land directly on the observable element.
  // (Recorded as a §14.3 testability finding; tasks.md prescribed
  // <TextField/> here but the runtime contract requires a non-FormField
  // child to observe the injection.)
  describe('UseIdWiring', () => {
    it('LabelProvided_HtmlForMatchesInputId', () => {
      render(
        <FormField label="Name">
          <input />
        </FormField>
      );
      const input = screen.getByLabelText('Name') as HTMLInputElement;
      const label = screen.getByText('Name').closest('label') as HTMLLabelElement;
      expect(input.id).not.toBe('');
      expect(label.htmlFor).toBe(input.id);
    });

    it('RequiredTrue_AriaRequiredOnInputAndIndicatorInLabel', () => {
      const { container } = render(
        <FormField label="Name" required>
          <input />
        </FormField>
      );
      const input = screen.getByLabelText(/Name/) as HTMLInputElement;
      expect(input).toHaveAttribute('aria-required', 'true');

      const indicator = container.querySelector(
        '.required_indicator'
      ) as HTMLSpanElement;
      expect(indicator).not.toBeNull();
      expect(indicator.tagName).toBe('SPAN');
      expect(indicator).toHaveAttribute('aria-hidden', 'true');
      expect(indicator.textContent?.startsWith(' *')).toBe(true);
    });

    it('RequiredFalse_NoAriaRequiredAndNoIndicator', () => {
      const { container } = render(
        <FormField label="Name">
          <input />
        </FormField>
      );
      const input = screen.getByLabelText('Name');
      expect(input.hasAttribute('aria-required')).toBe(false);
      expect(container.querySelector('.required_indicator')).toBeNull();
    });

    it('ErrorProvided_AriaInvalidAndDescribedbyLinksFieldError', () => {
      const { container } = render(
        <FormField label="Name" error="Required">
          <input />
        </FormField>
      );
      const input = screen.getByLabelText('Name') as HTMLInputElement;
      expect(input).toHaveAttribute('aria-invalid', 'true');

      const fieldError = container.querySelector(
        '.field_error'
      ) as HTMLParagraphElement;
      expect(fieldError).not.toBeNull();
      expect(fieldError.textContent).toBe('Required');
      expect(fieldError.id).not.toBe('');

      const describedBy = input.getAttribute('aria-describedby') ?? '';
      expect(describedBy.split(' ')).toContain(fieldError.id);
    });

    it('ErrorUndefined_NoFieldErrorRendered', () => {
      const { container } = render(
        <FormField label="Name">
          <input />
        </FormField>
      );
      expect(container.querySelector('.field_error')).toBeNull();
      const input = screen.getByLabelText('Name');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
    });

    it('DescriptionProvided_AriaDescribedbyLinksDescription', () => {
      const { container } = render(
        <FormField label="Name" description="Helper">
          <input />
        </FormField>
      );
      const desc = container.querySelector(
        '.form_field_description'
      ) as HTMLParagraphElement;
      expect(desc).not.toBeNull();
      expect(desc.textContent).toBe('Helper');
      expect(desc.id).not.toBe('');

      const input = screen.getByLabelText('Name') as HTMLInputElement;
      const describedBy = input.getAttribute('aria-describedby') ?? '';
      expect(describedBy.split(' ')).toContain(desc.id);
    });

    it('DescriptionAndError_BothLinkedSpaceJoined', () => {
      const { container } = render(
        <FormField label="Name" description="Helper" error="Required">
          <input />
        </FormField>
      );
      const desc = container.querySelector(
        '.form_field_description'
      ) as HTMLParagraphElement;
      const err = container.querySelector(
        '.field_error'
      ) as HTMLParagraphElement;
      const input = screen.getByLabelText(/Name/) as HTMLInputElement;
      const describedBy = input.getAttribute('aria-describedby') ?? '';
      expect(describedBy.split(' ').sort()).toEqual([desc.id, err.id].sort());
    });

    it('NeitherDescriptionNorError_AriaDescribedbyUndefined', () => {
      render(
        <FormField label="Name">
          <input />
        </FormField>
      );
      const input = screen.getByLabelText('Name');
      expect(input.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('IconPositionGrid', () => {
    it('IconOmitted_FieldClassHasNoIconClass', () => {
      const { container } = render(
        <FormField label="x">
          <TextField />
        </FormField>
      );
      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field).toHaveClass('form_field');
      expect(field).not.toHaveClass('icon_left');
      expect(field).not.toHaveClass('icon_right');
    });

    it('IconProvidedDefaultPosition_FieldClassHasIconLeft', () => {
      const { container } = render(
        <FormField label="x" icon={<svg data-testid="i" />}>
          <TextField />
        </FormField>
      );
      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field).toHaveClass('icon_left');
      const firstIconWrap = field.firstElementChild as HTMLElement;
      expect(firstIconWrap).toHaveClass('field_icon');
      expect(firstIconWrap.querySelector('[data-testid="i"]')).not.toBeNull();
    });

    it('IconProvidedRight_FieldClassHasIconRight', () => {
      const { container } = render(
        <FormField label="x" icon={<svg data-testid="i" />} iconPosition="right">
          <TextField />
        </FormField>
      );
      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field).toHaveClass('icon_right');
      const lastIconWrap = field.lastElementChild as HTMLElement;
      expect(lastIconWrap).toHaveClass('field_icon');
      expect(lastIconWrap.querySelector('[data-testid="i"]')).not.toBeNull();
    });
  });

  describe('InvalidAndSizeClasses', () => {
    it('ErrorProvided_FieldClassHasInvalid', () => {
      const { container } = render(
        <FormField label="x" error="bad">
          <TextField />
        </FormField>
      );
      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field).toHaveClass('invalid');
    });

    it('ErrorOmitted_FieldClassDoesNotHaveInvalid', () => {
      const { container } = render(
        <FormField label="x">
          <TextField />
        </FormField>
      );
      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field).not.toHaveClass('invalid');
    });

    it('SizeSm_FieldClassHasFormFieldSm', () => {
      const { container } = render(
        <FormField label="x" size="sm">
          <TextField />
        </FormField>
      );
      const field = container.querySelector('.form_field') as HTMLDivElement;
      expect(field).toHaveClass('form_field-sm');
    });

    it('SizeOmittedOrMd_NoSmClass', () => {
      const { container: noSizeContainer } = render(
        <FormField label="x">
          <TextField />
        </FormField>
      );
      expect(
        noSizeContainer.querySelector('.form_field')
      ).not.toHaveClass('form_field-sm');

      const { container: mdContainer } = render(
        <FormField label="x" size="md">
          <TextField />
        </FormField>
      );
      expect(mdContainer.querySelector('.form_field')).not.toHaveClass(
        'form_field-sm'
      );
    });
  });

  describe('ClassNameOnOuter', () => {
    it('ClassNameProvided_AppendedToFormFieldGroup', () => {
      const { container } = render(
        <FormField className="my-extra">
          <TextField />
        </FormField>
      );
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).toHaveClass('form_field_group', 'my-extra');
    });

    it('ClassNameOmitted_OnlyFormFieldGroup', () => {
      const { container } = render(
        <FormField>
          <TextField />
        </FormField>
      );
      const outer = container.firstChild as HTMLDivElement;
      expect(outer.className).toBe('form_field_group');
    });
  });
});

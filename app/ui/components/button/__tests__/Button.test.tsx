/* eslint-disable testing-library/no-node-access --
 * The `button-system` spec mandates a `.btn-spinner` decorative span
 * (aria-hidden) and a `.sr-only` wrapper around children in the loading
 * state. Neither carries a role/label, so role-based queries cannot reach
 * them; `querySelector` by class is the only way to lock the rendered
 * structural contract. AT-observable surface (`aria-busy`, accessible name)
 * is asserted separately via role queries.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { VARIANTS, cap } from './test-helpers';

describe('Button', () => {
  describe('VariantSizeMatrix', () => {
    for (const variant of VARIANTS) {
      it(`Variant${cap(variant)}DefaultSize_RendersBtnAnd${cap(variant)}Class`, () => {
        render(<Button variant={variant}>label</Button>);
        expect(screen.getByRole('button')).toHaveClass('btn', variant);
      });

      it(`Variant${cap(variant)}SizeSm_RendersBtnSmToken`, () => {
        render(
          <Button variant={variant} size="sm">
            label
          </Button>
        );
        expect(screen.getByRole('button')).toHaveClass('btn', variant, 'btn-sm');
      });

      it(`Variant${cap(variant)}SizeMd_OmitsBtnSmToken`, () => {
        render(
          <Button variant={variant} size="md">
            label
          </Button>
        );
        const button = screen.getByRole('button');
        expect(button).toHaveClass('btn', variant);
        expect(button).not.toHaveClass('btn-sm');
      });
    }
  });

  describe('LoadingStateContract', () => {
    it('IsLoadingTrue_RendersSpinnerSpanWithBtnSpinnerClass', () => {
      render(
        <Button variant="primary" isLoading>
          Save
        </Button>
      );
      const button = screen.getByRole('button');
      const spinner = button.querySelector('.btn-spinner');
      expect(spinner).not.toBeNull();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('IsLoadingTrue_WrapsChildrenInSrOnlySpan', () => {
      render(
        <Button variant="primary" isLoading>
          Save
        </Button>
      );
      const button = screen.getByRole('button');
      const srOnly = button.querySelector('.sr-only');
      expect(srOnly).not.toBeNull();
      expect(srOnly).toHaveTextContent('Save');
    });

    it('IsLoadingTrue_SetsAriaBusyTrue', () => {
      render(
        <Button variant="primary" isLoading>
          Save
        </Button>
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('IsLoadingTrue_AccessibleNameUnchanged', () => {
      render(
        <Button variant="primary" isLoading>
          Save
        </Button>
      );
      expect(screen.getByRole('button')).toHaveAccessibleName('Save');
    });

    it('IsLoadingFalse_NoSpinnerNoAriaBusy', () => {
      render(
        <Button variant="primary" isLoading={false}>
          Save
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button.querySelector('.btn-spinner')).toBeNull();
      expect(button).not.toHaveAttribute('aria-busy');
    });

    it('IsLoadingOmitted_NoSpinnerNoAriaBusy', () => {
      render(<Button variant="primary">Save</Button>);
      const button = screen.getByRole('button');
      expect(button.querySelector('.btn-spinner')).toBeNull();
      expect(button).not.toHaveAttribute('aria-busy');
    });

    it('IsLoadingTrue_RendersChildrenLiterallyOnceInSrOnly', () => {
      render(
        <Button variant="primary" isLoading>
          Save
        </Button>
      );
      const button = screen.getByRole('button');
      // Children appear exactly once in the DOM — inside the .sr-only wrapper.
      const occurrences = button.textContent?.match(/Save/g) ?? [];
      expect(occurrences).toHaveLength(1);
      expect(button.querySelector('.sr-only')).toHaveTextContent('Save');
    });
  });

  describe('DisabledShortCircuit', () => {
    it('DisabledOmittedIsLoadingOmitted_RenderedButtonNotDisabled', () => {
      render(<Button variant="primary">Save</Button>);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('DisabledTrueIsLoadingOmitted_RenderedButtonDisabled', () => {
      render(
        <Button variant="primary" disabled>
          Save
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).not.toHaveAttribute('aria-busy');
    });

    it('DisabledOmittedIsLoadingTrue_RenderedButtonDisabledAndBusy', () => {
      render(
        <Button variant="primary" isLoading>
          Save
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('DisabledTrueIsLoadingTrue_RenderedButtonDisabledAndBusy', () => {
      render(
        <Button variant="primary" disabled isLoading>
          Save
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('IsLoadingTrue_OnClickHandlerNotInvoked', async () => {
      const spy = vi.fn();
      render(
        <Button variant="primary" isLoading onClick={spy}>
          Save
        </Button>
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole('button'));
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('ToggleStateContract', () => {
    it('PressedTrue_AriaPressedTrueAttribute', () => {
      render(
        <Button variant="on-dark" pressed>
          X
        </Button>
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('PressedFalse_AriaPressedFalseAttribute', () => {
      render(
        <Button variant="on-dark" pressed={false}>
          X
        </Button>
      );
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });

    it('PressedUndefined_NoAriaPressedAttribute', () => {
      render(<Button variant="primary">X</Button>);
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed');
    });
  });

  describe('TypeAttributeDefault', () => {
    it('TypeOmitted_RenderedTypeButton', () => {
      render(<Button variant="primary">Save</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('TypeSubmit_RenderedTypeSubmit', () => {
      render(
        <Button variant="primary" type="submit">
          Save
        </Button>
      );
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('TypeReset_RenderedTypeReset', () => {
      render(
        <Button variant="primary" type="reset">
          Save
        </Button>
      );
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });

  describe('ClassNamePassthrough', () => {
    it('ClassNameProvided_AppearsAsExtraAfterVariantTokens', () => {
      render(
        <Button variant="primary" className="page-action">
          X
        </Button>
      );
      expect(screen.getByRole('button')).toHaveClass(
        'btn',
        'primary',
        'page-action'
      );
    });

    it('ClassNameMultiToken_AllTokensPresent', () => {
      render(
        <Button variant="primary" className="a b c">
          X
        </Button>
      );
      expect(screen.getByRole('button')).toHaveClass(
        'btn',
        'primary',
        'a',
        'b',
        'c'
      );
    });
  });

  describe('ForwardRefResolvesToButtonElement', () => {
    it('RefAttached_ResolvesToButtonElement', () => {
      const ref = createRef<HTMLButtonElement>();
      render(
        <Button ref={ref} variant="primary">
          X
        </Button>
      );
      expect(ref.current?.tagName).toBe('BUTTON');
    });
  });

  describe('ArbitraryHtmlAttributePassthrough', () => {
    it('OnClickProvided_FiresOnClick', async () => {
      const spy = vi.fn();
      render(
        <Button variant="primary" onClick={spy}>
          X
        </Button>
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole('button'));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('AriaLabelProvided_AccessibleNameMatchesAriaLabel', () => {
      render(
        <Button variant="primary" aria-label="Delete list">
          <span aria-hidden="true">×</span>
        </Button>
      );
      expect(screen.getByRole('button')).toHaveAccessibleName('Delete list');
    });

    it('DataAttributeProvided_RenderedVerbatim', () => {
      render(
        <Button variant="primary" data-testid="x">
          X
        </Button>
      );
      expect(screen.getByRole('button')).toHaveAttribute('data-testid', 'x');
    });

    it('NameValueProvided_RenderedVerbatim', () => {
      render(
        <Button variant="primary" name="action" value="save">
          X
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('name', 'action');
      expect(button).toHaveAttribute('value', 'save');
    });
  });
});

/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * `form-shell-system` SHALLs lock exact DOM shape (.form-shell-overlay,
 * .form-shell inner div with exact-string class, header .form-shell-hd
 * containing .form-shell-title span and .form-shell-close button, footer
 * .form-shell-ft with .form-shell-ft-right wrapper). These containers carry
 * no role or accessible name, so role-based queries cannot reach them;
 * `container.querySelector` is the only way to assert the spec'd structure.
 * Overlay-self-target click also requires `fireEvent.click(overlay)` to
 * deterministically dispatch on the overlay (Decision 6 in design.md).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormShell, FormShellFooter } from '../FormShell';

const backSpy = vi.fn();
const pushSpy = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backSpy, push: pushSpy }),
}));

// jsdom's `history.back()` is async (dispatches popstate on the next tick),
// so a while-loop reset never terminates. Stub `window.history.length` per
// test via `Object.defineProperty` instead — deterministic, synchronous, and
// restored in afterEach.
const setHistoryLength = (n: number) => {
  Object.defineProperty(window.history, 'length', {
    configurable: true,
    get: () => n,
  });
};

beforeEach(() => {
  backSpy.mockReset();
  pushSpy.mockReset();
  setHistoryLength(1);
});

afterEach(() => {
  // Restore the native `history.length` getter so subsequent test files
  // observe real jsdom behavior.
  // @ts-expect-error -- delete a defined property to restore the prototype getter.
  delete window.history.length;
});

describe('FormShell', () => {
  describe('OverlayAndInner', () => {
    it('OverlayAndInner_WrapHeaderAndChildren', () => {
      const { container } = render(
        <FormShell title="New list">
          <div data-testid="child">body</div>
        </FormShell>
      );
      const overlay = container.querySelector('.form-shell-overlay');
      expect(overlay).not.toBeNull();
      const inner = overlay!.querySelector('.form-shell');
      expect(inner).not.toBeNull();
      const header = inner!.querySelector('.form-shell-hd');
      expect(header).not.toBeNull();
      expect(header!.querySelector('.form-shell-title')!.textContent).toBe(
        'New list'
      );
      expect(header!.querySelector('.form-shell-close')).not.toBeNull();
      expect(inner!.querySelector('[data-testid="child"]')).not.toBeNull();
    });

    it('VariantDefault_RendersFormShellClass', () => {
      const { container } = render(
        <FormShell title="t">
          <div>body</div>
        </FormShell>
      );
      const inner = container.querySelector('.form-shell-overlay > div')!;
      expect(inner.className).toBe('form-shell');
    });

    it('VariantWide_RendersFormShellAndFormShellWideClasses', () => {
      const { container } = render(
        <FormShell title="t" variant="wide">
          <div>body</div>
        </FormShell>
      );
      const inner = container.querySelector('.form-shell-overlay > div')!;
      expect(inner.className).toBe('form-shell form-shell-wide');
    });

    it('VariantSplit_RendersFormShellAndFormShellSplitClasses', () => {
      const { container } = render(
        <FormShell title="t" variant="split">
          <div>body</div>
        </FormShell>
      );
      const inner = container.querySelector('.form-shell-overlay > div')!;
      expect(inner.className).toBe('form-shell form-shell-split');
    });

    it('Title_RenderedInsideFormShellTitleSpan', () => {
      const { container } = render(
        <FormShell title="Edit item">
          <div>body</div>
        </FormShell>
      );
      const titleSpan = container.querySelector('span.form-shell-title');
      expect(titleSpan).not.toBeNull();
      expect(titleSpan!.textContent).toBe('Edit item');
    });

    it('Children_RenderInsideFormShellInner', () => {
      const { container } = render(
        <FormShell title="t">
          <div data-testid="child">body</div>
        </FormShell>
      );
      const inner = container.querySelector('.form-shell')!;
      expect(inner.querySelector('[data-testid="child"]')).not.toBeNull();
    });
  });

  describe('CloseButton', () => {
    it('CloseButton_AriaLabelClose', () => {
      render(
        <FormShell title="t" onClose={vi.fn()}>
          <div>body</div>
        </FormShell>
      );
      expect(
        screen.getByRole('button', { name: 'Close' })
      ).toBeInTheDocument();
    });

    it('CloseButton_TypeButton', () => {
      render(
        <FormShell title="t" onClose={vi.fn()}>
          <div>body</div>
        </FormShell>
      );
      expect(
        screen.getByRole('button', { name: 'Close' }).getAttribute('type')
      ).toBe('button');
    });

    it('CloseButton_Click_InvokesDismiss', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <FormShell title="t" onClose={onClose}>
          <div>body</div>
        </FormShell>
      );
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('OverlayClickDismiss', () => {
    it('OverlayClickOnSelf_InvokesDismiss', () => {
      const onClose = vi.fn();
      const { container } = render(
        <FormShell title="t" onClose={onClose}>
          <div>body</div>
        </FormShell>
      );
      const overlay = container.querySelector('.form-shell-overlay')!;
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('OverlayClickOnChild_DoesNotDismiss', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <FormShell title="t" onClose={onClose}>
          <div data-testid="child">body</div>
        </FormShell>
      );
      await user.click(screen.getByTestId('child'));
      expect(onClose).not.toHaveBeenCalled();
      expect(backSpy).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
    });
  });

  describe('UseDismiss', () => {
    it('UseDismiss_OnCloseProvided_InvokesOnClose_NotRouter', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      // Force history > 1 to prove onClose wins over router.back.
      setHistoryLength(2);
      render(
        <FormShell title="t" onClose={onClose} closeHref="/lists">
          <div>body</div>
        </FormShell>
      );
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(backSpy).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('UseDismiss_NoOnClose_HistoryAvailable_InvokesRouterBack', async () => {
      const user = userEvent.setup();
      setHistoryLength(2);
      expect(window.history.length).toBeGreaterThan(1);
      render(
        <FormShell title="t" closeHref="/lists">
          <div>body</div>
        </FormShell>
      );
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(backSpy).toHaveBeenCalledTimes(1);
      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('UseDismiss_NoOnClose_NoHistory_CloseHrefProvided_InvokesRouterPushWithHref', async () => {
      const user = userEvent.setup();
      expect(window.history.length).toBe(1);
      render(
        <FormShell title="t" closeHref="/lists">
          <div>body</div>
        </FormShell>
      );
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(pushSpy).toHaveBeenCalledTimes(1);
      expect(pushSpy).toHaveBeenCalledWith('/lists');
      expect(backSpy).not.toHaveBeenCalled();
    });

    it('UseDismiss_NoOnClose_NoHistory_NoCloseHref_NoOp', async () => {
      const user = userEvent.setup();
      expect(window.history.length).toBe(1);
      render(
        <FormShell title="t">
          <div>body</div>
        </FormShell>
      );
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(backSpy).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
    });
  });
});

describe('FormShellFooter', () => {
  describe('Cancel', () => {
    it('FormShellFooter_CancelButton_VariantGhost', () => {
      render(<FormShellFooter submitLabel="Save" onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(
        'btn',
        'ghost'
      );
    });

    it('FormShellFooter_CancelButton_InvokesItsOwnDismissResolution', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const onClose = vi.fn();
      render(
        <FormShell title="t" onClose={onClose}>
          <FormShellFooter submitLabel="Save" onCancel={onCancel} />
        </FormShell>
      );
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Submit', () => {
    it('FormShellFooter_SubmitButton_TypeSubmit_VariantPrimary', () => {
      render(<FormShellFooter submitLabel="Save" />);
      const submit = screen.getByRole('button', { name: 'Save' });
      expect(submit.getAttribute('type')).toBe('submit');
      expect(submit).toHaveClass('btn', 'primary');
    });

    it('FormShellFooter_SubmitLabel_RendersInsideSubmit', () => {
      render(<FormShellFooter submitLabel="Save changes" />);
      expect(
        screen.getByRole('button', { name: 'Save changes' })
      ).toBeInTheDocument();
    });

    it('FormShellFooter_IsPendingTrue_SubmitIsLoadingTrue', () => {
      render(<FormShellFooter submitLabel="Save" isPending />);
      const submit = screen.getByRole('button', { name: 'Save' });
      expect(submit.getAttribute('aria-busy')).toBe('true');
      expect(submit.querySelector('.btn-spinner')).not.toBeNull();
    });

    it('FormShellFooter_IsPendingFalse_SubmitIsLoadingFalse', () => {
      render(<FormShellFooter submitLabel="Save" isPending={false} />);
      const submit = screen.getByRole('button', { name: 'Save' });
      expect(submit.getAttribute('aria-busy')).toBeNull();
      expect(submit.querySelector('.btn-spinner')).toBeNull();
    });

    it('FormShellFooter_IsPendingUndefined_SubmitIsLoadingUndefined', () => {
      render(<FormShellFooter submitLabel="Save" />);
      const submit = screen.getByRole('button', { name: 'Save' });
      expect(submit.getAttribute('aria-busy')).toBeNull();
      expect(submit.querySelector('.btn-spinner')).toBeNull();
    });
  });

  describe('DeleteSlot', () => {
    it('FormShellFooter_DeleteSlot_RenderedBetweenCancelAndSubmit', () => {
      const { container } = render(
        <FormShellFooter
          submitLabel="Save"
          deleteSlot={<button data-testid="del">Delete</button>}
        />
      );
      const footer = container.querySelector('.form-shell-ft')!;
      const right = footer.querySelector('.form-shell-ft-right')!;
      expect(right.querySelector('[data-testid="del"]')).not.toBeNull();

      const buttons = Array.from(footer.querySelectorAll('button'));
      const cancelIdx = buttons.findIndex(
        (b) => b.textContent === 'Cancel'
      );
      const delIdx = buttons.findIndex(
        (b) => b.getAttribute('data-testid') === 'del'
      );
      const submitIdx = buttons.findIndex(
        (b) => b.textContent === 'Save'
      );
      expect(cancelIdx).toBeLessThan(delIdx);
      expect(delIdx).toBeLessThan(submitIdx);
    });

    it('FormShellFooter_NoDeleteSlot_OnlyCancelAndSubmit', () => {
      const { container } = render(<FormShellFooter submitLabel="Save" />);
      const footer = container.querySelector('.form-shell-ft')!;
      const buttons = Array.from(footer.querySelectorAll('button'));
      expect(buttons).toHaveLength(2);
      expect(buttons[0].textContent).toBe('Cancel');
      expect(buttons[1].textContent).toBe('Save');
    });
  });
});

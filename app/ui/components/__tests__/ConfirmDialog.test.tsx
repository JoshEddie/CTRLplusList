/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * `confirm-dialog-system` SHALLs lock exact DOM shape (overlay class, content
 * class, title/message tag + class). The overlay/content containers carry no
 * role or accessible name, so role-based queries cannot reach them; classed
 * descendant queries via `container.querySelector` are the only way to assert
 * the spec'd structure.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  describe('ClosedState', () => {
    it('IsOpenFalse_RendersNothing', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Delete?"
          message="Are you sure?"
        />
      );
      expect(
        container.querySelector('.confirm-dialog-overlay')
      ).toBeNull();
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
  });

  describe('OpenState', () => {
    it('IsOpenTrue_RendersOverlayAndContentAndButtons', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Delete?"
          message="Are you sure?"
        />
      );
      const overlay = container.querySelector('.confirm-dialog-overlay');
      expect(overlay).not.toBeNull();
      const content = overlay!.querySelector('.confirm-dialog-content');
      expect(content).not.toBeNull();
      const buttonRow = content!.querySelector('.confirm-dialog-buttons');
      expect(buttonRow).not.toBeNull();
      expect(buttonRow!.querySelectorAll('button')).toHaveLength(2);
    });

    it('TitleAndMessage_RenderedAsHeadingAndParagraph', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Delete?"
          message="Are you sure?"
        />
      );
      const title = container.querySelector('h3.confirm-dialog-title');
      const message = container.querySelector('p.confirm-dialog-message');
      expect(title).not.toBeNull();
      expect(title!.textContent).toBe('Delete?');
      expect(message).not.toBeNull();
      expect(message!.textContent).toBe('Are you sure?');
    });

    it('MessageAcceptsReactNode_RendersComplexChildren', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message={<span data-testid="x">hi</span>}
        />
      );
      const message = container.querySelector('p.confirm-dialog-message');
      expect(message).not.toBeNull();
      expect(
        message!.querySelector('span[data-testid="x"]')
      ).not.toBeNull();
    });
  });

  describe('ButtonRowOrder', () => {
    it('NoTertiary_TwoButtonsOnly', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
        />
      );
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveAccessibleName('Cancel');
      expect(buttons[1]).toHaveAccessibleName('Confirm');
    });

    it('WithTertiary_ThreeButtonsInOrder', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
          tertiary={{ label: 'Keep', onClick: vi.fn() }}
        />
      );
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      expect(buttons[0]).toHaveAccessibleName('Keep');
      expect(buttons[1]).toHaveAccessibleName('Cancel');
      expect(buttons[2]).toHaveAccessibleName('Confirm');
    });
  });

  describe('ButtonVariants', () => {
    it('CancelButton_VariantGhost', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
        />
      );
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(
        'btn',
        'ghost'
      );
    });

    it('ConfirmButton_VariantDanger', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
        />
      );
      expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass(
        'btn',
        'danger'
      );
    });

    it('TertiaryDefaultVariant_Primary', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
          tertiary={{ label: 'Keep', onClick: vi.fn() }}
        />
      );
      expect(screen.getByRole('button', { name: 'Keep' })).toHaveClass(
        'btn',
        'primary'
      );
    });

    it('TertiaryExplicitSecondary_Secondary', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
          tertiary={{ label: 'Keep', onClick: vi.fn(), variant: 'secondary' }}
        />
      );
      expect(screen.getByRole('button', { name: 'Keep' })).toHaveClass(
        'btn',
        'secondary'
      );
    });
  });

  describe('ClickBehavior', () => {
    it('CancelClick_CallsOnCloseOnce-NotOnConfirmOrTertiary', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const tertiaryClick = vi.fn();
      render(
        <ConfirmDialog
          isOpen
          onClose={onClose}
          onConfirm={onConfirm}
          title="t"
          message="m"
          tertiary={{ label: 'Keep', onClick: tertiaryClick }}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
      expect(tertiaryClick).not.toHaveBeenCalled();
    });

    it('ConfirmClick_CallsOnConfirmThenOnClose', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      render(
        <ConfirmDialog
          isOpen
          onClose={onClose}
          onConfirm={onConfirm}
          title="t"
          message="m"
        />
      );
      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm.mock.invocationCallOrder[0]).toBeLessThan(
        onClose.mock.invocationCallOrder[0]
      );
    });

    it('TertiaryClick_CallsTertiaryOnClickThenOnClose', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const tertiaryClick = vi.fn();
      render(
        <ConfirmDialog
          isOpen
          onClose={onClose}
          onConfirm={vi.fn()}
          title="t"
          message="m"
          tertiary={{ label: 'Keep', onClick: tertiaryClick }}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Keep' }));
      expect(tertiaryClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(tertiaryClick.mock.invocationCallOrder[0]).toBeLessThan(
        onClose.mock.invocationCallOrder[0]
      );
    });
  });

  describe('LabelDefaults', () => {
    it('ConfirmTextDefault_Confirm', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
        />
      );
      expect(
        screen.getByRole('button', { name: 'Confirm' })
      ).toBeInTheDocument();
    });

    it('CancelTextDefault_Cancel', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
        />
      );
      expect(
        screen.getByRole('button', { name: 'Cancel' })
      ).toBeInTheDocument();
    });

    it('ConfirmTextOverride_RendersOverride', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
          confirmText="Delete"
        />
      );
      expect(
        screen.getByRole('button', { name: 'Delete' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Confirm' })
      ).not.toBeInTheDocument();
    });

    it('CancelTextOverride_RendersOverride', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
          cancelText="Keep"
        />
      );
      expect(
        screen.getByRole('button', { name: 'Keep' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Cancel' })
      ).not.toBeInTheDocument();
    });

    it('TertiaryLabel_RenderedInsideTertiaryButton', () => {
      render(
        <ConfirmDialog
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="t"
          message="m"
          tertiary={{ label: 'Move to trash', onClick: vi.fn() }}
        />
      );
      expect(
        screen.getByRole('button', { name: 'Move to trash' })
      ).toBeInTheDocument();
    });
  });
});

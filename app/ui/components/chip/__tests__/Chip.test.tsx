/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The `chip-system` spec mandates that the wrapper is a non-interactive
 * `<span class="chip">` and that the remove `<button>` is its last child.
 * The wrapper carries no role/label, so role-based queries cannot reach it;
 * `container.firstChild` / `querySelector('.chip')` are the only ways to
 * lock the wrapper's tag, class composition, and child ordering. The
 * remove-button's AT-observable surface (role, accessible name, disabled
 * state) is still asserted via role-based queries.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from '../Chip';

const noop = () => {};

describe('Chip', () => {
  describe('DomShape', () => {
    it('Default_RenderedOuterIsSpanWithChipClass', () => {
      const { container } = render(<Chip onRemove={noop}>Foo</Chip>);
      const outer = container.firstChild as HTMLElement;
      expect(outer.tagName).toBe('SPAN');
      expect(outer).toHaveClass('chip');
    });

    it('Default_RemoveChildIsButtonWithChipRemoveClass', () => {
      render(<Chip onRemove={noop}>Foo</Chip>);
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveClass('chip-remove');
    });

    it('Default_NoOtherInteractiveElementInSubtree', () => {
      render(<Chip onRemove={noop}>Foo</Chip>);
      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('Default_RemoveButtonTypeIsButton', () => {
      render(<Chip onRemove={noop}>Foo</Chip>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });

  describe('ClassNamePassthrough', () => {
    it('ClassNameProvided_AppearsAsExtraOnWrapper', () => {
      const { container } = render(
        <Chip className="custom-token" onRemove={noop}>
          Foo
        </Chip>
      );
      expect(container.firstChild as HTMLElement).toHaveClass(
        'chip',
        'custom-token'
      );
    });

    it('ClassNameMultiToken_AllTokensPresent', () => {
      const { container } = render(
        <Chip className="a b c" onRemove={noop}>
          Foo
        </Chip>
      );
      expect(container.firstChild as HTMLElement).toHaveClass(
        'chip',
        'a',
        'b',
        'c'
      );
    });

    it('ClassNameOmitted_OnlyChipClass', () => {
      const { container } = render(<Chip onRemove={noop}>Foo</Chip>);
      const outer = container.firstChild as HTMLElement;
      expect(outer).toHaveClass('chip');
      expect(outer.className).toBe('chip');
    });
  });

  describe('AriaLabelDerivation', () => {
    it('RemoveLabelOmittedChildrenString_AriaLabelIsRemovePlusChildren', () => {
      render(<Chip onRemove={noop}>Tag A</Chip>);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Remove Tag A'
      );
    });

    it('RemoveLabelOmittedChildrenElement_AriaLabelIsRemove', () => {
      render(
        <Chip onRemove={noop}>
          <span>Tag A</span>
        </Chip>
      );
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Remove'
      );
    });

    it('RemoveLabelProvidedChildrenString_AriaLabelIsRemoveLabel', () => {
      render(
        <Chip onRemove={noop} removeLabel="Clear filter">
          Tag A
        </Chip>
      );
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Clear filter'
      );
    });

    it('RemoveLabelProvidedChildrenElement_AriaLabelIsRemoveLabel', () => {
      render(
        <Chip onRemove={noop} removeLabel="Clear">
          <span>X</span>
        </Chip>
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Clear');
    });
  });

  describe('OnRemoveCallbackContract', () => {
    it('XClicked_OnRemoveInvokedOnce', async () => {
      const spy = vi.fn();
      render(<Chip onRemove={spy}>Foo</Chip>);
      await userEvent.click(screen.getByRole('button'));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('XClicked_DoesNotBubbleToParentClickHandler', async () => {
      const parentSpy = vi.fn();
      const removeSpy = vi.fn();
      render(
        <div onClick={parentSpy}>
          <Chip onRemove={removeSpy}>Foo</Chip>
        </div>
      );
      await userEvent.click(screen.getByRole('button'));
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(parentSpy).toHaveBeenCalledTimes(0);
    });

    it('XClickedInsideForm_DoesNotSubmitForm', async () => {
      const submitSpy = vi.fn();
      const removeSpy = vi.fn();
      render(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSpy();
          }}
        >
          <Chip onRemove={removeSpy}>Foo</Chip>
        </form>
      );
      await userEvent.click(screen.getByRole('button'));
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(submitSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('DisabledPassthrough', () => {
    it('DisabledTrue_RenderedButtonDisabled', () => {
      render(
        <Chip disabled onRemove={noop}>
          Foo
        </Chip>
      );
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('DisabledTrueXClicked_OnRemoveNotInvoked', async () => {
      const spy = vi.fn();
      render(
        <Chip disabled onRemove={spy}>
          Foo
        </Chip>
      );
      await userEvent.click(screen.getByRole('button'));
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('DisabledTrue_AriaLabelUnchanged', () => {
      render(
        <Chip disabled onRemove={noop}>
          Tag A
        </Chip>
      );
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Remove Tag A'
      );
    });

    it('DisabledFalse_RenderedButtonNotDisabled', async () => {
      const spy = vi.fn();
      render(
        <Chip disabled={false} onRemove={spy}>
          Foo
        </Chip>
      );
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      await userEvent.click(button);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('DisabledOmitted_RenderedButtonNotDisabled', async () => {
      const spy = vi.fn();
      render(<Chip onRemove={spy}>Foo</Chip>);
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      await userEvent.click(button);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('ChildrenRender', () => {
    it('ChildrenString_RenderedAsWrapperLeadingContent', () => {
      const { container } = render(<Chip onRemove={noop}>Foo</Chip>);
      const wrapper = container.querySelector('.chip') as HTMLElement;
      expect(wrapper).toHaveTextContent(/Foo/);
      const firstChild = wrapper.firstChild;
      expect(firstChild?.nodeType).toBe(Node.TEXT_NODE);
      expect(firstChild?.textContent).toBe('Foo');
    });

    it('ChildrenElement_RenderedAsWrapperLeadingContent', () => {
      const { container } = render(
        <Chip onRemove={noop}>
          <span data-testid="inner">Tag A</span>
        </Chip>
      );
      const inner = screen.getByTestId('inner');
      const wrapper = container.querySelector('.chip') as HTMLElement;
      expect(wrapper.contains(inner)).toBe(true);
      const removeBtn = container.querySelector('.chip-remove') as HTMLElement;
      expect(removeBtn.contains(inner)).toBe(false);
    });
  });

  describe('IndependentInstances', () => {
    it('TwoChipsRendered_EachOnRemoveFiresIndependently', async () => {
      const spyA = vi.fn();
      const spyB = vi.fn();
      render(
        <>
          <Chip onRemove={spyA}>A</Chip>
          <Chip onRemove={spyB}>B</Chip>
        </>
      );
      const buttonA = screen.getByRole('button', { name: 'Remove A' });
      const buttonB = screen.getByRole('button', { name: 'Remove B' });
      await userEvent.click(buttonA);
      expect(spyA).toHaveBeenCalledTimes(1);
      expect(spyB).toHaveBeenCalledTimes(0);
      await userEvent.click(buttonB);
      expect(spyA).toHaveBeenCalledTimes(1);
      expect(spyB).toHaveBeenCalledTimes(1);
    });
  });
});

/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * Listener-scope assertions require asserting on the rendered container `<div
 * role="radiogroup">` directly (the keydown listener target). Several
 * tests dispatch `fireEvent.keyDown` on that exact element, and the
 * `addEventListener` spy filters calls by their `this`-binding. Both
 * patterns need direct element references; RTL role queries return the
 * same element but `container` traversal is the clearest way to express
 * "the listener's target" intent. See design.md Decision 3d / Decision 4.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { createRef } from 'react';
import { SegmentedControl } from '../SegmentedControl';
import { SegmentedOption } from '../SegmentedOption';

describe('SegmentedControl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('DomShape', () => {
    it('Default_RendersDivWithRadiogroup', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      const group = screen.getByRole('radiogroup');
      expect(group.tagName).toBe('DIV');
    });

    it('AriaLabel_ForwardedToContainer', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="View toggle"
        >
          <SegmentedOption value="a">A</SegmentedOption>
        </SegmentedControl>
      );
      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'aria-label',
        'View toggle'
      );
    });

    it('AriaLabelledBy_ForwardedToContainer', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-labelledby="label-id"
        >
          <SegmentedOption value="a">A</SegmentedOption>
        </SegmentedControl>
      );
      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'aria-labelledby',
        'label-id'
      );
    });

    it('ClassName_AppendedAsExtra', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          className="foo"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
        </SegmentedControl>
      );
      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'class',
        'segmented tone-light foo'
      );
    });

    it('RefForwarding_PointsAtRadiogroupDiv', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <SegmentedControl
          ref={ref}
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
        </SegmentedControl>
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toBe(screen.getByRole('radiogroup'));
    });
  });

  describe('ToneClass', () => {
    it('ToneLight_RendersToneLightClassOnContainer', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
        </SegmentedControl>
      );
      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'class',
        'segmented tone-light'
      );
    });

    it('ToneOnDark_RendersToneOnDarkClassOnContainer', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="on-dark"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
        </SegmentedControl>
      );
      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'class',
        'segmented tone-on-dark'
      );
    });
  });

  describe('ContextProvision', () => {
    it('SelectedOption_AriaCheckedTrue', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('UnselectedOption_AriaCheckedFalse', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('ChildOption_ClickFiresContextOnChange', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <SegmentedControl
          value="a"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      await user.click(screen.getByRole('radio', { name: 'B' }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('b');
    });
  });

  describe('KeyboardListenerScope', () => {
    let addSpy: MockInstance<typeof Element.prototype.addEventListener>;
    let removeSpy: MockInstance<typeof Element.prototype.removeEventListener>;
    let docAddSpy: MockInstance<typeof document.addEventListener>;

    beforeEach(() => {
      addSpy = vi.spyOn(Element.prototype, 'addEventListener');
      removeSpy = vi.spyOn(Element.prototype, 'removeEventListener');
      docAddSpy = vi.spyOn(document, 'addEventListener');
    });

    it('ListenerScopedToContainer_NotDocument', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      const group = screen.getByRole('radiogroup');
      const keydownCalls = addSpy.mock.calls
        .map((call, idx) => ({ call, ctx: addSpy.mock.contexts[idx] }))
        .filter(({ call }) => call[0] === 'keydown');
      const containerCalls = keydownCalls.filter(
        ({ ctx }) => ctx === group
      );
      expect(containerCalls.length).toBe(1);
      const docKeydownCalls = docAddSpy.mock.calls.filter(
        ([type]) => type === 'keydown'
      );
      expect(docKeydownCalls.length).toBe(0);
    });

    it('Unmount_ListenerRemovedFromContainer', () => {
      const { unmount } = render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      const group = screen.getByRole('radiogroup');
      removeSpy.mockClear();
      unmount();
      const removeCalls = removeSpy.mock.calls
        .map((call, idx) => ({ call, ctx: removeSpy.mock.contexts[idx] }))
        .filter(({ call, ctx }) => call[0] === 'keydown' && ctx === group);
      expect(removeCalls.length).toBe(1);
    });

    it('KeydownOnSiblingOutsideContainer_NoOnChange', () => {
      const onChange = vi.fn();
      const { container } = render(
        <div>
          <button type="button" data-testid="sibling">
            outside
          </button>
          <SegmentedControl
            value="a"
            onChange={onChange}
            tone="light"
            aria-label="g"
          >
            <SegmentedOption value="a">A</SegmentedOption>
            <SegmentedOption value="b">B</SegmentedOption>
          </SegmentedControl>
        </div>
      );
      const sibling = container.querySelector(
        '[data-testid="sibling"]'
      ) as HTMLElement;
      fireEvent.keyDown(sibling, { key: 'ArrowRight' });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('OnChangeIdentityChange_ListenerReattachedWithNewCallback', () => {
      const spyA = vi.fn();
      const spyB = vi.fn();
      const { rerender } = render(
        <SegmentedControl
          value="a"
          onChange={spyA}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      rerender(
        <SegmentedControl
          value="a"
          onChange={spyB}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
      expect(spyB).toHaveBeenCalledTimes(1);
      expect(spyB).toHaveBeenCalledWith('b');
      expect(spyA).not.toHaveBeenCalled();
    });

    it('ValueChange_ListenerNotReattached', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <SegmentedControl
          value="a"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      const group = screen.getByRole('radiogroup');
      rerender(
        <SegmentedControl
          value="b"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      const containerKeydownAdds = addSpy.mock.calls
        .map((call, idx) => ({ call, ctx: addSpy.mock.contexts[idx] }))
        .filter(({ call, ctx }) => call[0] === 'keydown' && ctx === group);
      expect(containerKeydownAdds.length).toBe(1);
    });
  });

  describe('KeyboardNavigation', () => {
    it('ArrowRight_AdvancesAndFiresOnChange', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="a"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('b');
    });

    it('ArrowDown_AdvancesAndFiresOnChange', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="a"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' });
      expect(onChange).toHaveBeenCalledWith('b');
    });

    it('ArrowLeft_RetreatsAndFiresOnChange', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="b"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith('a');
    });

    it('ArrowUp_RetreatsAndFiresOnChange', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="b"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowUp' });
      expect(onChange).toHaveBeenCalledWith('a');
    });

    it('LastOption_ArrowRightWrapsToFirst', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="c"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
          <SegmentedOption value="c">C</SegmentedOption>
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith('a');
    });

    it('FirstOption_ArrowLeftWrapsToLast', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="a"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
          <SegmentedOption value="c">C</SegmentedOption>
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith('c');
    });

    it('NonArrowKey_NoOnChangeNoPreventDefault', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="a"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      const group = screen.getByRole('radiogroup');
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        cancelable: true,
        bubbles: true,
      });
      group.dispatchEvent(event);
      expect(onChange).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('ArrowRight_FocusMovesToNextOption', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(
        screen.getByRole('radio', { name: 'B' })
      );
    });

    it('ArrowRight_CallsPreventDefault', () => {
      render(
        <SegmentedControl
          value="a"
          onChange={() => {}}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </SegmentedControl>
      );
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        cancelable: true,
        bubbles: true,
      });
      screen.getByRole('radiogroup').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('KeyboardEdgeCases', () => {
    it('NoCheckedOption_ArrowRightSelectsFirst', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="__none__"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
          <SegmentedOption value="c">C</SegmentedOption>
        </SegmentedControl>
      );
      const group = screen.getByRole('radiogroup');
      const checked = group.querySelector('[aria-checked="true"]');
      expect(checked).toBeNull();
      fireEvent.keyDown(group, { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith('a');
    });

    it('NoCheckedOption_ArrowLeftSelectsSecondToLast', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="__none__"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
          <SegmentedOption value="c">C</SegmentedOption>
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith('b');
    });

    it('EmptyOptions_ArrowRightNoOnChange', () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          value="a"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          {null}
        </SegmentedControl>
      );
      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('SyntheticOptionWithoutDataValue_ArrowRightNoOnChange', () => {
      const onChange = vi.fn();
      const { container } = render(
        <SegmentedControl
          value="__none__"
          onChange={onChange}
          tone="light"
          aria-label="g"
        >
          <button type="button" role="radio" aria-checked="false">
            synthetic
          </button>
        </SegmentedControl>
      );
      const group = screen.getByRole('radiogroup');
      const synthetic = container.querySelector(
        '[role="radio"]'
      ) as HTMLButtonElement;
      expect(synthetic.dataset.value).toBeUndefined();
      fireEvent.keyDown(group, { key: 'ArrowRight' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

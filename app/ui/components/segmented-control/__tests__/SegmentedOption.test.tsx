import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRef, type ReactNode } from 'react';
import { SegmentedControl } from '../SegmentedControl';
import { SegmentedOption } from '../SegmentedOption';

function ProviderHarness({
  children,
  value = 'a',
  onChange = () => {},
  tone = 'light' as const,
}: {
  children: ReactNode;
  value?: string;
  onChange?: (v: string) => void;
  tone?: 'light' | 'on-dark';
}) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      tone={tone}
      aria-label="g"
    >
      {children}
    </SegmentedControl>
  );
}

describe('SegmentedOption', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('DomShape', () => {
    it('Default_RendersButtonWithRadioRole', () => {
      render(
        <ProviderHarness>
          <SegmentedOption value="a">A</SegmentedOption>
        </ProviderHarness>
      );
      const btn = screen.getByRole('radio', { name: 'A' });
      expect(btn.tagName).toBe('BUTTON');
    });

    it('Default_RendersButtonTypeButton', () => {
      render(
        <ProviderHarness>
          <SegmentedOption value="a">A</SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute(
        'type',
        'button'
      );
    });

    it('DataValue_MirrorsValueProp', () => {
      render(
        <ProviderHarness>
          <SegmentedOption value="grid">Grid</SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute(
        'data-value',
        'grid'
      );
    });

    it('Children_RenderInsideButton', () => {
      render(
        <ProviderHarness>
          <SegmentedOption value="a">
            <span data-testid="child">label-content</span>
          </SegmentedOption>
        </ProviderHarness>
      );
      const btn = screen.getByRole('radio');
      const child = screen.getByTestId('child');
      expect(btn).toContainElement(child);
    });

    it('RefForwarding_PointsAtButton', () => {
      const ref = createRef<HTMLButtonElement>();
      render(
        <ProviderHarness>
          <SegmentedOption ref={ref} value="a">
            A
          </SegmentedOption>
        </ProviderHarness>
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('ActiveState', () => {
    it('ContextValueMatches_AriaCheckedTrue', () => {
      render(
        <ProviderHarness value="a">
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('ContextValueDiffers_AriaCheckedFalse', () => {
      render(
        <ProviderHarness value="a">
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('ContextValueMatches_TabIndex0', () => {
      render(
        <ProviderHarness value="a">
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute(
        'tabindex',
        '0'
      );
    });

    it('ContextValueDiffers_TabIndexNegative1', () => {
      render(
        <ProviderHarness value="a">
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute(
        'tabindex',
        '-1'
      );
    });

    it('ContextValueMatches_ActiveClassPresent', () => {
      render(
        <ProviderHarness value="a">
          <SegmentedOption value="a">A</SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute(
        'class',
        'segmented-option active'
      );
    });

    it('ContextValueDiffers_NoActiveClass', () => {
      render(
        <ProviderHarness value="a">
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute(
        'class',
        'segmented-option'
      );
    });

    it('ClassNameForwarded_AppendedAsExtra', () => {
      render(
        <ProviderHarness value="a">
          <SegmentedOption value="a" className="foo">
            A
          </SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute(
        'class',
        'segmented-option active foo'
      );
    });
  });

  describe('ClickBehavior', () => {
    it('InactiveOption_Click_FiresOnChangeWithValue', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <ProviderHarness value="a" onChange={onChange}>
          <SegmentedOption value="a">A</SegmentedOption>
          <SegmentedOption value="b">B</SegmentedOption>
        </ProviderHarness>
      );
      await user.click(screen.getByRole('radio', { name: 'B' }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('b');
    });

    it('ActiveOption_Click_StillFiresOnChange', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <ProviderHarness value="a" onChange={onChange}>
          <SegmentedOption value="a">A</SegmentedOption>
        </ProviderHarness>
      );
      await user.click(screen.getByRole('radio', { name: 'A' }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('a');
    });
  });

  describe('PropsPassthrough', () => {
    it('Disabled_ReachesButton', () => {
      render(
        <ProviderHarness>
          <SegmentedOption value="a" disabled>
            A
          </SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'A' })).toBeDisabled();
    });

    it('AriaLabel_ReachesButton', () => {
      render(
        <ProviderHarness>
          <SegmentedOption value="a" aria-label="grid view">
            A
          </SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'grid view' })).toHaveAttribute(
        'aria-label',
        'grid view'
      );
    });

    it('DataTestId_ReachesButton', () => {
      render(
        <ProviderHarness>
          <SegmentedOption value="a" data-testid="opt-a">
            A
          </SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByTestId('opt-a')).toHaveAttribute('role', 'radio');
    });

    it('CustomId_ReachesButton', () => {
      render(
        <ProviderHarness>
          <SegmentedOption value="a" id="custom-id">
            A
          </SegmentedOption>
        </ProviderHarness>
      );
      expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute(
        'id',
        'custom-id'
      );
    });

    it('OmittedProps_NotForwardedAsDomAttributes', () => {
      render(
        <ProviderHarness value="a">
          <SegmentedOption value="a">A</SegmentedOption>
        </ProviderHarness>
      );
      const btn = screen.getByRole('radio', { name: 'A' });
      expect(btn).toHaveAttribute('aria-checked', 'true');
      expect(btn).not.toHaveAttribute('value');
      expect(btn).not.toHaveAttribute('onchange');
    });
  });

  describe('ContextThrow', () => {
    it('OrphanRender_ThrowsDescriptiveError', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() =>
        render(<SegmentedOption value="x">label</SegmentedOption>)
      ).toThrow(
        '<SegmentedOption> must be rendered inside a <SegmentedControl>'
      );
    });
  });
});

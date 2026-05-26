/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * SearchField renders a custom <div class="form_field search_field"> rather
 * than wrapping in <FormField>. The outer div carries no role/label, so
 * container queries are required to assert its class composition and the
 * search icon's leading position.
 */
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchField } from '../SearchField';

const noop = () => {};

describe('SearchField', () => {
  describe('DomShape', () => {
    it('Default_RendersDivWithSearchClassesAndInput', () => {
      const { container } = render(
        <SearchField value="" onChange={noop} />
      );
      const outer = container.firstChild as HTMLDivElement;
      expect(outer.tagName).toBe('DIV');
      expect(outer).toHaveClass('form_field', 'search_field', 'no_trailing');

      const input = outer.querySelector('input') as HTMLInputElement;
      expect(input).toHaveClass('form_field_input');
      expect(input).toHaveAttribute('type', 'search');

      const iconWrap = outer.firstElementChild as HTMLElement;
      expect(iconWrap).toHaveClass('field_icon');
      expect(iconWrap.querySelector('svg')).not.toBeNull();
    });
  });

  describe('TrailingBranch', () => {
    it('TrailingProvided_RendersTrailingNode', () => {
      const { container } = render(
        <SearchField
          value="x"
          onChange={noop}
          trailing={<span data-testid="t" />}
        />
      );
      expect(screen.getByTestId('t')).toBeInTheDocument();
      expect(container.querySelector('.search_field_clear')).toBeNull();
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).not.toHaveClass('no_trailing');
    });

    it('OnClearWithNonEmptyValue_RendersClearButton', async () => {
      const spy = vi.fn();
      render(<SearchField value="abc" onChange={noop} onClear={spy} />);
      const btn = screen.getByRole('button', { name: 'Clear search' });
      expect(btn).toHaveAttribute('type', 'button');
      expect(btn).toHaveClass('search_field_clear');
      await userEvent.click(btn);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('OnClearWithEmptyValue_NoClearButtonAndNoTrailing', () => {
      const { container } = render(
        <SearchField value="" onChange={noop} onClear={vi.fn()} />
      );
      expect(container.querySelector('.search_field_clear')).toBeNull();
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).toHaveClass('no_trailing');
    });

    it('OnClearWithUndefinedValue_NoClearButtonAndNoTrailing', () => {
      const { container } = render(<SearchField onClear={vi.fn()} />);
      expect(container.querySelector('.search_field_clear')).toBeNull();
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).toHaveClass('no_trailing');
    });

    it('NeitherTrailingNorOnClear_NoTrailingClass', () => {
      const { container } = render(
        <SearchField value="abc" onChange={noop} />
      );
      expect(container.querySelector('.search_field_clear')).toBeNull();
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).toHaveClass('no_trailing');
    });

    it('BothTrailingAndOnClear_TrailingWins', () => {
      // Discriminated union forbids both at the type level; the runtime
      // contract per design D3c is `hasTrailingNode` short-circuits. Bypass
      // the type to verify the runtime precedence.
      const spy = vi.fn();
      const { container } = render(
        // @ts-expect-error — intentionally passes both `trailing` and `onClear`
        // to verify the runtime branch picks `trailing` when the type would forbid both.
        <SearchField
          value="abc"
          onChange={noop}
          trailing={<span data-testid="t" />}
          onClear={spy}
        />
      );
      expect(screen.getByTestId('t')).toBeInTheDocument();
      expect(container.querySelector('.search_field_clear')).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('PropPassthrough', () => {
    it('OnChangeForwarded_ToInput', async () => {
      const spy = vi.fn();
      render(<SearchField defaultValue="" onChange={spy} />);
      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'x');
      expect(spy).toHaveBeenCalled();
    });

    it('Ref_ResolvesToInputElement', () => {
      const ref = createRef<HTMLInputElement>();
      render(<SearchField ref={ref} value="" onChange={noop} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveClass('form_field_input');
    });

    it('ClassNameProvided_AppendedToOuterDiv', () => {
      const { container } = render(
        <SearchField
          value="x"
          onChange={noop}
          onClear={vi.fn()}
          className="layout-extra"
        />
      );
      const outer = container.firstChild as HTMLDivElement;
      expect(outer).toHaveClass(
        'form_field',
        'search_field',
        'layout-extra'
      );
      expect(outer).not.toHaveClass('no_trailing');
    });

    it('ClassNameOmitted_NoTrailingSpace', () => {
      const { container } = render(
        <SearchField value="x" onChange={noop} onClear={vi.fn()} />
      );
      const outer = container.firstChild as HTMLDivElement;
      expect(outer.className).not.toMatch(/\s$/);
      expect(outer.className).not.toContain('undefined');
    });
  });
});

/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * `tooltip-system` SHALLs lock exact-string class composition and the optional
 * `.tooltip` span's presence/absence. The wrapper and span carry no role or
 * accessible name, so role-based queries cannot reach them;
 * `container.querySelector` is the only way to assert the structural contract.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TooltipWrapper from '../TooltipWrapper';

describe('TooltipWrapper', () => {
  describe('WrapperClass', () => {
    it('Default_RendersDivWithTooltipContainerClass', () => {
      const { container } = render(
        <TooltipWrapper>
          <span data-testid="child">child</span>
        </TooltipWrapper>
      );
      const wrapper = container.firstElementChild;
      expect(wrapper).not.toBeNull();
      expect(wrapper!.tagName).toBe('DIV');
      expect(wrapper!.className).toContain('tooltip-container');
    });

    it('NoClassName_WrapperClassIsBaseOnly', () => {
      const { container } = render(
        <TooltipWrapper>
          <span>child</span>
        </TooltipWrapper>
      );
      const wrapper = container.querySelector('div')!;
      expect(wrapper.className).toBe('tooltip-container');
    });

    it('WithClassName_AppendedAfterSingleSpace', () => {
      const { container } = render(
        <TooltipWrapper className="foo">
          <span>child</span>
        </TooltipWrapper>
      );
      const wrapper = container.querySelector('div')!;
      expect(wrapper.className).toBe('tooltip-container foo');
    });

    it('EmptyStringClassName_BehavesLikeUndefined', () => {
      const { container } = render(
        <TooltipWrapper className="">
          <span>child</span>
        </TooltipWrapper>
      );
      const wrapper = container.querySelector('div')!;
      expect(wrapper.className).toBe('tooltip-container');
    });
  });

  describe('Children', () => {
    it('Children_RenderInsideWrapper', () => {
      const { container } = render(
        <TooltipWrapper>
          <span data-testid="x">child</span>
        </TooltipWrapper>
      );
      const wrapper = container.querySelector('div.tooltip-container');
      expect(wrapper).not.toBeNull();
      expect(
        wrapper!.querySelector('span[data-testid="x"]')
      ).not.toBeNull();
      expect(screen.getByTestId('x').textContent).toBe('child');
    });
  });

  describe('ShowTooltip', () => {
    it('ShowTooltipDefaultTrue_TooltipSpanRendered', () => {
      const { container } = render(
        <TooltipWrapper tooltip="hi">
          <span>child</span>
        </TooltipWrapper>
      );
      const tooltipSpan = container.querySelector('span.tooltip');
      expect(tooltipSpan).not.toBeNull();
      expect(tooltipSpan!.textContent).toBe('hi');
    });

    it('ShowTooltipFalse_NoTooltipSpan', () => {
      const { container } = render(
        <TooltipWrapper tooltip="hi" showTooltip={false}>
          <span>child</span>
        </TooltipWrapper>
      );
      expect(container.querySelector('span.tooltip')).toBeNull();
    });

    it('ShowTooltipTrue_TooltipTextRenderedInsideSpan', () => {
      const { container } = render(
        <TooltipWrapper
          tooltip="Available after the gift is opened"
          showTooltip
        >
          <span>child</span>
        </TooltipWrapper>
      );
      const tooltipSpan = container.querySelector('span.tooltip');
      expect(tooltipSpan).not.toBeNull();
      expect(tooltipSpan!.textContent).toBe(
        'Available after the gift is opened'
      );
    });

    it('ShowTooltipTrueNoTooltipProp_SpanRenderedEmpty', () => {
      const { container } = render(
        <TooltipWrapper showTooltip>
          <span>child</span>
        </TooltipWrapper>
      );
      const tooltipSpan = container.querySelector('span.tooltip');
      expect(tooltipSpan).not.toBeNull();
      expect(tooltipSpan!.textContent).toBe('');
    });
  });
});

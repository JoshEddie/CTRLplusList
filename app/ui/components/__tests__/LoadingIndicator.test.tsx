/* eslint-disable testing-library/no-node-access -- spec delta SHALL (Decision 3b) mandates exact DOM-shape assertions on children[0]/children[1] (element type, order, class, aria-hidden, text). Querying by role/text alone cannot prove there are EXACTLY two SPAN children in fixed order. */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingIndicator from '../LoadingIndicator';

describe('LoadingIndicator', () => {
  describe('DomShape', () => {
    it('Default_RendersDivAsOuterElement', () => {
      render(<LoadingIndicator size="rail" />);
      expect(screen.getByRole('status').tagName).toBe('DIV');
    });

    it('Default_RendersExactlyTwoChildSpans', () => {
      render(<LoadingIndicator size="rail" />);
      const outer = screen.getByRole('status');
      expect(outer.children).toHaveLength(2);
      expect(outer.children[0].tagName).toBe('SPAN');
      expect(outer.children[1].tagName).toBe('SPAN');
    });

    it('FirstChild_IsSpinnerSpan', () => {
      render(<LoadingIndicator size="rail" />);
      const first = screen.getByRole('status').children[0];
      expect(first.tagName).toBe('SPAN');
      expect(first.className).toBe('loading-indicator__spinner');
      expect(first.textContent).toBe('');
    });

    it('SecondChild_IsSrOnlyLabelSpan', () => {
      render(<LoadingIndicator size="rail" />);
      const second = screen.getByRole('status').children[1];
      expect(second.tagName).toBe('SPAN');
      expect(second.className).toBe('sr-only');
    });
  });

  describe('ClassComposition', () => {
    it('SizeInline_RendersExactClassString', () => {
      render(<LoadingIndicator size="inline" />);
      expect(screen.getByRole('status').className).toBe(
        'loading-indicator loading-indicator--inline'
      );
    });

    it('SizeRail_RendersExactClassString', () => {
      render(<LoadingIndicator size="rail" />);
      expect(screen.getByRole('status').className).toBe(
        'loading-indicator loading-indicator--rail'
      );
    });

    it('SizeForm_RendersExactClassString', () => {
      render(<LoadingIndicator size="form" />);
      expect(screen.getByRole('status').className).toBe(
        'loading-indicator loading-indicator--form'
      );
    });

    it('SizePage_RendersExactClassString', () => {
      render(<LoadingIndicator size="page" />);
      expect(screen.getByRole('status').className).toBe(
        'loading-indicator loading-indicator--page'
      );
    });
  });

  describe('Accessibility', () => {
    it('OuterDiv_RoleStatus', () => {
      render(<LoadingIndicator size="rail" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('OuterDiv_AriaLivePolite', () => {
      render(<LoadingIndicator size="rail" />);
      expect(screen.getByRole('status').getAttribute('aria-live')).toBe(
        'polite'
      );
    });

    it('SpinnerSpan_AriaHiddenTrue', () => {
      render(<LoadingIndicator size="rail" />);
      const spinner = screen.getByRole('status').children[0];
      expect(spinner.getAttribute('aria-hidden')).toBe('true');
    });

    it('LabelText_IsExactlyLoadingEllipsisCharacter', () => {
      render(<LoadingIndicator size="rail" />);
      const label = screen.getByRole('status').children[1];
      expect(label.textContent).toBe('Loading…');
    });
  });
});

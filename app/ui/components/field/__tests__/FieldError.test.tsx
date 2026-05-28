/* eslint-disable testing-library/no-node-access --
 * FieldError renders a single `<p>` (or null). The element carries no role
 * — `role="alert"` is explicitly forbidden by the spec. Direct firstChild
 * access is required to assert the `<p>` id/class/text and the
 * null-on-falsy-children short-circuit.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FieldError } from '../FieldError';

describe('FieldError', () => {
  describe('TruthyChildren', () => {
    it('ChildrenString_RendersParagraphWithIdAndClass', () => {
      const { container } = render(
        <FieldError id="err-1">Name is required</FieldError>
      );
      const p = container.firstChild as HTMLParagraphElement;
      expect(p.tagName).toBe('P');
      expect(p).toHaveAttribute('id', 'err-1');
      expect(p).toHaveClass('field_error');
      expect(p).toHaveTextContent('Name is required');
    });
  });

  describe('FalsyChildren_RendersNothing', () => {
    it('ChildrenUndefined_RendersNothing', () => {
      const { container } = render(<FieldError id="err-1" />);
      expect(container.firstChild).toBeNull();
    });

    it('ChildrenNull_RendersNothing', () => {
      const { container } = render(<FieldError>{null}</FieldError>);
      expect(container.firstChild).toBeNull();
    });

    it('ChildrenFalse_RendersNothing', () => {
      const { container } = render(<FieldError>{false}</FieldError>);
      expect(container.firstChild).toBeNull();
    });

    it('ChildrenZero_RendersNothing', () => {
      const { container } = render(<FieldError>{0}</FieldError>);
      expect(container.firstChild).toBeNull();
    });

    it('ChildrenEmptyString_RendersNothing', () => {
      const { container } = render(<FieldError>{''}</FieldError>);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('IdHandling', () => {
    it('IdOmitted_RenderedParagraphHasNoIdAttribute', () => {
      const { container } = render(<FieldError>Required</FieldError>);
      const p = container.firstChild as HTMLParagraphElement;
      expect(p.hasAttribute('id')).toBe(false);
    });
  });

  describe('NoLiveRegionSemantics', () => {
    it('Rendered_HasNoRoleOrAriaLive', () => {
      const { container } = render(<FieldError>Required</FieldError>);
      const p = container.firstChild as HTMLParagraphElement;
      expect(p.hasAttribute('role')).toBe(false);
      expect(p.hasAttribute('aria-live')).toBe(false);
    });
  });
});

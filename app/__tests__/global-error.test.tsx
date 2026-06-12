import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import GlobalError from '../global-error';

// global-error renders its own <html>/<body>, which jsdom cannot mount inside
// a container div, so these tests inspect the returned element tree directly
// (same approach as `loading.test.tsx`).

const makeError = (digest?: string) =>
  Object.assign(new Error('secret internal failure'), { digest });

function flatten(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== 'object' || !('type' in node)) return [];
  const el = node as ReactElement<{ children?: ReactNode }>;
  return [el, ...flatten(el.props.children)];
}

const treeFor = (digest?: string) =>
  flatten(GlobalError({ error: makeError(digest), reset: vi.fn() }));

const textOf = (el: ReactElement) =>
  flatten(el).length === 1
    ? String((el.props as { children?: ReactNode }).children)
    : '';

describe('GlobalError', () => {
  describe('Document', () => {
    it('Render_RootIsSelfContainedHtmlWithBody', () => {
      const tree = treeFor();
      expect(tree[0].type).toBe('html');
      expect(tree.some((el) => el.type === 'body')).toBe(true);
    });

    it('Render_ShowsSomethingWentWrongHeading-OmitsRawErrorMessage', () => {
      const tree = treeFor();
      const h1 = tree.find((el) => el.type === 'h1');
      expect(h1).toBeDefined();
      expect(textOf(h1!)).toBe('Something went wrong');
      expect(tree.some((el) => textOf(el).includes('secret internal failure'))).toBe(
        false
      );
    });
  });

  describe('Retry', () => {
    it('ClickTryAgain_InvokesResetOnce', () => {
      const reset = vi.fn();
      const tree = flatten(GlobalError({ error: makeError(), reset }));
      const button = tree.find((el) => el.type === 'button')!;
      expect(button).toBeDefined();
      (button.props as { onClick: () => void }).onClick();
      expect(reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Digest', () => {
    const findDigestLine = (tree: ReactElement[]) =>
      tree.find((el) => {
        const children = (el.props as { children?: ReactNode }).children;
        return (
          el.type === 'p' &&
          Array.isArray(children) &&
          children.join('').includes('Error reference:')
        );
      });

    it('DigestPresent_ShowsErrorReferenceLine', () => {
      const digestLine = findDigestLine(treeFor('2207077172'));
      expect(digestLine).toBeDefined();
      const children = (digestLine!.props as { children: ReactNode[] })
        .children;
      expect(children.join('')).toBe('Error reference: 2207077172');
    });

    it('DigestAbsent_OmitsErrorReferenceLine', () => {
      expect(findDigestLine(treeFor())).toBeUndefined();
    });
  });
});

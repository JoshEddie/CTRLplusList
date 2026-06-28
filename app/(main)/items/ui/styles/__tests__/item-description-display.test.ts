import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Strip comments so commented-out clamp examples can't trip the assertions.
const css = readFileSync(
  resolve(process.cwd(), 'app/(main)/items/ui/styles/item.css'),
  'utf8'
).replace(/\/\*[\s\S]*?\*\//g, '');

// Declaration bodies of every rule whose selector targets `.itemDescription`.
function descriptionBlocks(): string[] {
  const blocks: string[] = [];
  const re = /([^{}]*\.itemDescription[^{}]*)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) blocks.push(m[2]);
  return blocks;
}

describe('itemDescriptionDisplay', () => {
  it('Selectors_TargetTheDescriptionAcrossLayouts', () => {
    expect(descriptionBlocks().length).toBeGreaterThanOrEqual(2);
  });

  it('Selectors_NeverClampLineCount', () => {
    for (const block of descriptionBlocks()) {
      expect(block).not.toMatch(/line-clamp/);
    }
  });

  it('Selectors_OmitWebkitBoxOrient', () => {
    for (const block of descriptionBlocks()) {
      expect(block).not.toMatch(/-webkit-box-orient/);
    }
  });
});

// Test-only helpers shared by `buttonClasses.test.ts`, `Button.test.tsx`,
// and `LinkButton.test.tsx`. Excluded from coverage in `vitest.config.ts`
// (test-fixture file, not production code).
import type { ButtonVariant } from '../types';

export const VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'ghost',
  'danger',
  'on-dark',
  'link',
];

// Normalize variant identifiers so PascalCase token reads cleanly:
// 'on-dark' → 'OnDark', 'primary' → 'Primary'.
export function cap(variant: ButtonVariant): string {
  return variant
    .split('-')
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('');
}

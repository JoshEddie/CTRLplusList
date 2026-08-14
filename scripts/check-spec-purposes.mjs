import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Grandfathered TBD stubs awaiting backfill. Ratchet only: the
// finalize-spec-purposes skill removes entries as it fills them in;
// never add to this list.
const KNOWN_TBD = new Set([
  'app-frame',
  'button-system',
  'chip-system',
  'confirm-dialog-system',
  'e2e-critical-flows',
  'e2e-management-flows',
  'e2e-pwa-offline',
  'empty-state-system',
  'error-boundary',
  'following',
  'form-field-system',
  'form-shell-system',
  'item-image-candidates',
  'items-browser-chrome',
  'items-library-shell',
  'list-collections',
  'list-item-management',
  'list-update-recency',
  'list-visibility',
  'menu-system',
  'popover-trigger-system',
  'segmented-control-system',
  'spec-review',
  'tooltip-system',
  'visit-history',
]);

const specsDir = path.join(process.cwd(), 'openspec', 'specs');
const failures = [];

const capabilities = readdirSync(specsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const capability of capabilities) {
  const specPath = path.join(specsDir, capability, 'spec.md');
  if (!existsSync(specPath)) continue;

  const content = readFileSync(specPath, 'utf8');
  const purposeMatch = content.match(/^## Purpose\s*\n([\s\S]*?)(?=^## |\n*$(?![\s\S]))/m);
  const purposeText = purposeMatch?.[1].trim() ?? '';
  const isStub = purposeText === '' || /^TBD\b/.test(purposeText);

  if (isStub && !KNOWN_TBD.has(capability)) {
    failures.push(
      `openspec/specs/${capability}/spec.md — Purpose is missing or a TBD stub.`,
    );
  }
  if (!isStub && KNOWN_TBD.has(capability)) {
    failures.push(
      `openspec/specs/${capability}/spec.md — Purpose is filled in but the capability is still listed in KNOWN_TBD; remove it from scripts/check-spec-purposes.mjs.`,
    );
  }
}

for (const capability of KNOWN_TBD) {
  if (!existsSync(path.join(specsDir, capability, 'spec.md'))) {
    failures.push(
      `KNOWN_TBD lists "${capability}" but openspec/specs/${capability}/spec.md does not exist; remove it from scripts/check-spec-purposes.mjs.`,
    );
  }
}

if (failures.length > 0) {
  console.error('Spec Purpose check failed:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    '\nTo backfill TBD Purposes, run the finalize-spec-purposes skill (/finalize-spec-purposes).',
  );
  process.exit(1);
}

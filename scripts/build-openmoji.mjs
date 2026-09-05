// Trims the OpenMoji package down to what the thing kind actually offers, at
// install time rather than at runtime: the package's metadata is 2.2MB of JSON
// that costs ~6.4MB of heap parsed, held for the life of every server
// instance, to produce ~0.4MB of catalog. Copying the surviving art into
// `public/` is what lets the CDN serve it, so no route and no function bundle
// carries 22MB of SVG.

import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PKG = path.join(process.cwd(), 'node_modules/openmoji');
const SVG_OUT = path.join(process.cwd(), 'public/openmoji');
const CATALOG_OUT = path.join(process.cwd(), 'lib/altvatar/openmoji.catalog.json');

// The kind exists for profiles that are not people, and the person kind
// already has its styles — so people go, faces go (cat and monkey faces
// included, via the whole smileys group), and with them the skin-tone
// variants where the combinatorial bulk lives. Flags go because an identity
// mark is not an allegiance, and brands because the art is licensed, not the
// marks it depicts. The symbols group goes whole: zodiac glyphs, AV buttons,
// math signs and punctuation are notation, not identities, and they dominated
// the browse page. The time subgroup goes for the same reason — twenty-four of
// its thirty-one entries are clock faces reading one o'clock through
// eleven-thirty.
const EXCLUDED_GROUPS = new Set([
  'people-body',
  'flags',
  'component',
  'symbols',
  'smileys-emotion',
  'extras-unicode',
]);

const EXCLUDED_SUBGROUPS = new Set([
  'people',
  'brand',
  'flags',
  'regional-indicator',
  'subdivision-flag',
  'ui-element',
  'symbols',
  'symbol-other',
  'interaction',
  'queer-symbols',
  'smileys-emotion',
  'emergency',
  'other-object',
  'healthcare',
  'climate-environment',
  'time',
]);

// Individual annotations pulled after the group cuts: weapons, drugs, the one
// produce item whose second meaning has displaced its first, and the human
// figures that dodged the people cut by living in extras-openmoji rather than
// people-body. Matched on annotation, not hexcode, so the duplicate emoji some
// labels carry across groups go together.
const EXCLUDED_LABELS = new Set([
  'bomb',
  'water pistol',
  'dagger',
  'axe',
  'syringe',
  'pill',
  'pills',
  'cigarette',
  'eggplant',
  'coffin',
  'headstone',
  'funeral urn',
  'drop of blood',
  'toilet',
  'lighter',
  'firecracker',
  'gardener man',
  'gardener woman',
]);

// Reaches back into an excluded group or subgroup for a single glyph the broad
// cut took with it. By hexcode, not annotation: a re-include names one entry,
// and some annotations are carried by more than one.
const INCLUDED_CODES = new Set([
  '231A', // watch — the time subgroup is clock faces, but watch collecting is a persona
]);

const kept = (e) =>
  INCLUDED_CODES.has(e.hexcode) ||
  (!EXCLUDED_GROUPS.has(e.group) &&
    !EXCLUDED_SUBGROUPS.has(e.subgroups) &&
    !EXCLUDED_LABELS.has(e.annotation) &&
    !e.skintone);

const raw = JSON.parse(
  await readFile(path.join(PKG, 'data/openmoji.json'), 'utf8')
);

// `[code, label, searchTerms]` rather than objects: the shape is read once by
// openmoji.catalog.ts, and tuples are what keep the generated file small.
const entries = raw
  .filter(kept)
  .map((e) => [
    e.hexcode,
    e.annotation,
    `${e.annotation} ${e.tags} ${e.openmoji_tags}`.toLowerCase(),
  ]);

await writeFile(CATALOG_OUT, JSON.stringify(entries));

// Rebuilt whole so a code dropped from the filters loses its art too, rather
// than lingering as a file the catalog no longer names.
await rm(SVG_OUT, { recursive: true, force: true });
await mkdir(SVG_OUT, { recursive: true });

const available = new Set(await readdir(path.join(PKG, 'color/svg')));
let copied = 0;
await Promise.all(
  entries.map(async ([code]) => {
    if (!available.has(`${code}.svg`)) return;
    await copyFile(
      path.join(PKG, 'color/svg', `${code}.svg`),
      path.join(SVG_OUT, `${code}.svg`)
    );
    copied++;
  })
);

console.log(
  `openmoji: ${entries.length} entries catalogued, ${copied} SVGs copied to public/openmoji`
);

import { DEFAULT_GLYPH } from '@/lib/altvatar/styles/openmoji';
import openmoji from 'openmoji/data/openmoji.json';

// The searchable set behind the thing kind, imported from the package's own
// metadata rather than hand-authored: the canonical-vocabulary rule exists so
// a selection survives a style change, and the thing kind has no sibling style
// to carry a value to. Server-side only — the metadata file is megabytes, which
// is the reason the surface over it is search-led rather than a browse grid.

export type OpenmojiEntry = { code: string; label: string };

type RawEntry = {
  hexcode: string;
  group: string;
  subgroups: string;
  annotation: string;
  tags: string;
  openmoji_tags: string;
  skintone: number | string;
};

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
// people-body. Matched on
// annotation, not hexcode, so the duplicate emoji some labels carry across
// groups go together.
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

const searchable = new Map<string, string>();

export const OPENMOJI_CATALOG: OpenmojiEntry[] = (openmoji as RawEntry[])
  .filter(
    (e) =>
      INCLUDED_CODES.has(e.hexcode) ||
      (!EXCLUDED_GROUPS.has(e.group) &&
        !EXCLUDED_SUBGROUPS.has(e.subgroups) &&
        !EXCLUDED_LABELS.has(e.annotation) &&
        !e.skintone)
  )
  .map((e) => {
    searchable.set(
      e.hexcode,
      `${e.annotation} ${e.tags} ${e.openmoji_tags}`.toLowerCase()
    );
    return { code: e.hexcode, label: e.annotation };
  });

const CODES = new Set(OPENMOJI_CATALOG.map((e) => e.code));

// The trust boundary for a stored `glyph`: a code outside the set — malformed,
// excluded, or retired — falls back rather than reaching the filesystem.
export const safeOpenmojiCode = (code: string | undefined): string =>
  code !== undefined && CODES.has(code) ? code : DEFAULT_GLYPH;

// Substring over annotation + both tag fields. An empty query returns the
// catalog itself so the surface opens populated rather than blank. Windowed
// with `offset`/`limit` — pages, not a growing tail, because the surface
// renders one page of tiles at a time. `hasMore` is what tells it a next page
// is worth offering.
export function searchOpenmoji(
  query: string,
  limit = 60,
  offset = 0
): { entries: OpenmojiEntry[]; hasMore: boolean } {
  const q = query.trim().toLowerCase();
  const entries: OpenmojiEntry[] = [];
  let skipped = 0;
  for (const entry of OPENMOJI_CATALOG) {
    if (q !== '' && !searchable.get(entry.code)!.includes(q)) continue;
    if (skipped < offset) {
      skipped++;
      continue;
    }
    if (entries.length === limit) return { entries, hasMore: true };
    entries.push(entry);
  }
  return { entries, hasMore: false };
}

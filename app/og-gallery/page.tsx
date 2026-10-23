import { db } from '@/db';
import { lists } from '@/db/schema';
import { ACCENT_PRESETS } from '@/lib/accent';
import { getList } from '@/lib/data/list';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import Section from './Section';
import Tile from './Tile';

// ponytail: throwaway gallery for spec #439, deleted before dev goes to a release branch.

const LIST_CARD_SUFFIX = 'opengraph-image-qvlx24';
const GIFT = '/openmoji/1F381.svg';

type Case = {
  label: string;
  owner: string;
  list: string;
  accent?: string;
  art?: string;
  artOf?: string;
};

function cardUrl(c: Case, v: number) {
  const q = new URLSearchParams({ owner: c.owner, list: c.list, v: String(v) });
  if (c.accent) q.set('accent', c.accent);
  if (c.art) q.set('art', c.art);
  if (c.artOf) q.set('artOf', c.artOf);
  return `/og-gallery/card?${q}`;
}

export const instant = false;

export default async function OgGallery() {
  await connection();
  if (process.env.VERCEL_ENV === 'production') notFound();

  const seeded = await db
    .select({ id: lists.id })
    .from(lists)
    .orderBy(lists.id);
  const withArt = await Promise.all(
    seeded.map(async ({ id }) => ({ id, list: await getList(id) }))
  );
  const toon = withArt.find((l) =>
    l.list?.profile.art?.startsWith('data:')
  )?.id;
  // eslint-disable-next-line react-hooks/purity -- renders per request; busts the cards' year-long cache
  const v = Date.now();

  const stress: Case[] = [
    { label: 'Name ≤10', owner: 'Grace', list: 'Toys', art: GIFT },
    {
      label: 'Name ≤20',
      owner: 'Grace',
      list: 'Christmas Wishlist',
      art: GIFT,
    },
    {
      label: 'Name ≤32',
      owner: 'Grace',
      list: "Grandma's Seventieth Birthday",
      art: GIFT,
    },
    {
      label: 'Name ≤40',
      owner: 'Grace',
      list: 'Back to School Supplies for the Twins',
      art: GIFT,
    },
    {
      label: 'Name >40',
      owner: 'Grace',
      list: 'Everything We Need for the New House Before the Baby Arrives in Spring',
      art: GIFT,
    },
    {
      label: 'Owner ≤36 action line',
      owner: 'Maximilian Featherstone',
      list: 'Birthday',
      art: GIFT,
    },
    {
      label: 'Owner >36 action line',
      owner: 'Bartholomew-Christopher Montgomery-Wellington III',
      list: 'Birthday',
      art: GIFT,
    },
    { label: 'Initials (no art)', owner: 'Grace Hopper', list: 'Birthday' },
    {
      label: 'Altvatar toon art',
      owner: 'Toon Owner',
      list: 'Birthday',
      artOf: toon,
    },
    {
      label: 'Accents + latin-ext',
      owner: 'Zoë Ångström-Ñandú',
      list: 'Crème Brûlée Łódź',
      art: GIFT,
    },
    {
      label: 'Emoji + non-Latin stripped',
      owner: 'Ana 🎄',
      list: '日本語 Wishlist 🎁',
      art: GIFT,
    },
    { label: 'Nothing drawable', owner: '🎅🎄', list: '🎁🎁', art: GIFT },
  ];
  const accents: Case[] = Object.keys(ACCENT_PRESETS).map((accent) => ({
    label: accent,
    owner: 'Grace',
    list: `${accent[0].toUpperCase()}${accent.slice(1)} List`,
    accent,
    art: GIFT,
  }));

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui',
        background: '#fff',
        color: '#111',
      }}
    >
      <h1>OG card gallery (dev only)</h1>
      <Section title="Brand card">
        <Tile label="/opengraph-image" src={`/opengraph-image?v=${v}`} />
      </Section>
      <Section title="Stress cases">
        {stress.map((c) => (
          <Tile key={c.label} label={c.label} src={cardUrl(c, v)} />
        ))}
      </Section>
      <Section title="Every accent">
        {accents.map((c) => (
          <Tile key={c.label} label={c.label} src={cardUrl(c, v)} />
        ))}
      </Section>
      <Section title="Seeded lists (real route)">
        {seeded.map(({ id }) => (
          <Tile
            key={id}
            label={id}
            src={`/lists/${id}/${LIST_CARD_SUFFIX}?v=${v}`}
          />
        ))}
      </Section>
    </main>
  );
}

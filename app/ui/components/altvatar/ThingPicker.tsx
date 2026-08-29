'use client';

import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { Button } from '@/app/ui/components/button';
import { SearchField } from '@/app/ui/components/field';
import '@/app/ui/styles/altvatar.css';
import type { OpenmojiEntry } from '@/lib/altvatar/openmoji.catalog';
import { openmojiArtUrl } from '@/lib/altvatar/styles/openmoji';
import { useEffect, useRef, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuCheck } from 'react-icons/lu';

const PAGE = 60;

// The thing kind's surface: search-led, because the catalog is thousands of
// pictures deep — a browse grid is not a control at that size. Results render
// on the same disc every other surface fills, so a tile shows what the avatar
// will actually look like. Paged rather than appended: one page of tiles in
// the DOM at a time, because an ever-growing grid made the panel's scroll lag.
export default function ThingPicker({
  current,
  accent,
  onPick,
}: {
  current: string | undefined;
  accent: string | null;
  onPick: (code: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<OpenmojiEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const gridTop = useRef<HTMLDivElement>(null);

  const search = (q: string) => {
    setQuery(q);
    setPage(0);
  };

  // Turning a page from its bottom would otherwise leave the viewer staring
  // at the new page's last row. Scrolls the customizer's own panel rather
  // than `scrollIntoView`, which on iOS also scrolls the page behind the
  // fixed shell and breaks its layout.
  const turnTo = (next: number) => {
    setPage(next);
    gridTop.current?.closest('.altvatar-panel')?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    let live = true;
    // Debounced a beat so typing searches the settled word, not every letter.
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/openmoji?q=${encodeURIComponent(query)}&limit=${PAGE}&offset=${page * PAGE}`
        );
        const body = (await res.json()) as {
          entries: OpenmojiEntry[];
          hasMore: boolean;
        };
        if (live) {
          setResults(body.entries);
          setHasMore(body.hasMore);
        }
      } catch {
        // A failed search leaves the last results standing; the field still
        // invites another try.
      }
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, page]);

  return (
    <div className="altvatar-axis" ref={gridTop}>
      <div className="altvatar-axis-hd">
        <h2 className="altvatar-axis-title">Icon</h2>
      </div>
      <SearchField
        placeholder="Search: dog, rocket, cake…"
        aria-label="Search icons"
        value={query}
        onChange={(e) => search(e.target.value)}
        onClear={() => search('')}
      />
      <div className="altvatar-tiles" role="radiogroup" aria-label="Icon">
        {results.map((entry) => {
          const selected = entry.code === current;
          return (
            <button
              key={entry.code}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`altvatar-tile${selected ? ' is-selected' : ''}`}
              onClick={() => onPick(entry.code)}
            >
              <ProfileAvatar
                profile={{
                  name: '',
                  accent,
                  art: openmojiArtUrl(entry.code),
                  avatarStyle: 'openmoji',
                }}
              />
              <span className="altvatar-tile-label">{entry.label}</span>
              {selected && (
                <span className="altvatar-tile-mark" aria-hidden>
                  <LuCheck />
                </span>
              )}
            </button>
          );
        })}
        {results.length === 0 && (
          <p className="altvatar-thing-empty">
            Nothing matches — try another word.
          </p>
        )}
      </div>
      {(page > 0 || hasMore) && (
        <div className="altvatar-thing-pager">
          {page > 0 && (
            <Button variant="secondary" onClick={() => turnTo(page - 1)}>
              <LuArrowLeft aria-hidden /> Back
            </Button>
          )}
          {hasMore && (
            <Button
              variant="secondary"
              className="altvatar-thing-next"
              onClick={() => turnTo(page + 1)}
            >
              More <LuArrowRight aria-hidden />
            </Button>
          )}
        </div>
      )}
      {/* CC BY-SA 4.0 requires attribution wherever the art is offered. */}
      <p className="altvatar-thing-credit">
        Art from{' '}
        <a href="https://openmoji.org" target="_blank" rel="noreferrer">
          OpenMoji
        </a>{' '}
        (CC BY-SA 4.0)
      </p>
    </div>
  );
}

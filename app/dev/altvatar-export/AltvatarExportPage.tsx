'use client';

import { Button } from '@/app/ui/components/button';
import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { ACCENT_PRESETS, randomAccentName } from '@/lib/accent';
import type { AccentName } from '@/lib/accent';
import { renderAltvatar } from '@/lib/altvatar/render';
import { rollAltvatar } from '@/lib/altvatar/shuffle';
import type { AltvatarValue } from '@/lib/altvatar/types';
import { useEffect, useState } from 'react';

const SIZE = 512;

async function toPng(art: string, accent: AccentName): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT_PRESETS[accent].light;
  ctx.fill();
  ctx.clip();

  const img = new Image();
  img.src = art;
  await img.decode();
  ctx.drawImage(img, 0, 0, SIZE, SIZE);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

export default function AltvatarExportPage() {
  const [roll, setRoll] = useState<{ value: AltvatarValue; accent: AccentName }>();
  const [art, setArt] = useState<string | null>(null);
  const [png, setPng] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);

  const surpriseMe = () => {
    setArt(null);
    setPng(null);
    setCopied(false);
    setRoll({ value: rollAltvatar(), accent: randomAccentName() });
  };

  useEffect(() => {
    if (!roll) return;
    let live = true;
    renderAltvatar(roll.value.style, roll.value.options)
      .then(async (next) => {
        if (!live) return;
        setArt(next);
        const blob = await toPng(next, roll.accent);
        if (live) setPng(blob);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [roll]);

  const copy = async () => {
    if (!png) return;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    setCopied(true);
  };

  return (
    <main style={{ display: 'grid', gap: '1rem', justifyItems: 'center', padding: '2rem' }}>
      <div style={{ width: 240, height: 240 }}>
        <ProfileAvatar
          profile={{
            name: '',
            accent: roll?.accent ?? null,
            art,
            avatarStyle: roll?.value.style ?? null,
          }}
          className="altvatar-export-disc"
        />
      </div>
      <code style={{ fontSize: '0.8rem' }}>
        {roll ? `${roll.value.style} · ${roll.accent}` : '…'}
      </code>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button variant="primary" onClick={surpriseMe}>
          Surprise Me
        </Button>
        <Button variant="secondary" onClick={copy} disabled={!png}>
          {copied ? 'Copied!' : 'Copy ALT+vatar'}
        </Button>
      </div>
      <style>{`.altvatar-export-disc { width: 100%; height: 100%; }`}</style>
    </main>
  );
}

'use client';

import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { renderAltvatar } from '@/lib/altvatar/render';
import type { AltvatarOptions } from '@/lib/altvatar/types';
import { useEffect, useState } from 'react';

// The live preview renders in the browser, so a stepper click costs no server
// round-trip. What it draws is never persisted: the save path re-derives the
// art from the same selections on the server, because a rendering that arrived
// from a client is arbitrary content shown to other people.
export default function AltvatarPreview({
  styleId,
  options,
  accent,
}: {
  styleId: string;
  options: AltvatarOptions;
  accent: string | null;
}) {
  const [art, setArt] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    renderAltvatar(styleId, options).then((next) => {
      if (live) setArt(next);
    });
    return () => {
      live = false;
    };
  }, [styleId, options]);

  return (
    <ProfileAvatar profile={{ name: '', accent, art, avatarStyle: styleId }} />
  );
}

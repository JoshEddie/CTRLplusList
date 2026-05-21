'use client';

import { useState } from 'react';
import { FaUser } from 'react-icons/fa';

function initialsOf(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export default function Avatar({
  src,
  name,
  size = 36,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!src && src.length > 0 && !imgFailed;
  const initials = initialsOf(name);

  return (
    <span
      className="user-avatar"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {showImage ? (
        // Plain <img> rather than next/image: hero avatars are 36px and the
        // 3rd-party Google URL set is open-ended, so the optimizer config
        // would need every origin whitelisted. Defer to native <img> here.
        <img
          src={src ?? undefined}
          alt=""
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
          className="user-avatar-img"
        />
      ) : initials ? (
        <span className="user-avatar-initials">{initials}</span>
      ) : (
        <FaUser className="user-avatar-fallback" />
      )}
    </span>
  );
}

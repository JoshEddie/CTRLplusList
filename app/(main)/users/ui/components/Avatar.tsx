'use client';

import { useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { initialsOf } from '../utils';

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
        // eslint-disable-next-line @next/next/no-img-element -- deliberate native <img>, see above
        <img
          /* v8 ignore next -- showImage guarantees src is a non-empty string here; the `?? undefined` is a type-narrowing fallback unreachable at runtime. */
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

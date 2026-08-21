import { initialsOf } from '@/app/(main)/users/ui/utils';
import { accentVars } from '@/lib/accent';

// The card's own head, rendered live from the form's current values, so the
// creator sees the accent applied rather than only the swatch it came from.
export default function AccentPreview({
  name,
  tagline,
  accent,
}: {
  name: string;
  tagline: string;
  accent: string;
}) {
  const trimmedName = name.trim();
  const trimmedTagline = tagline.trim();

  return (
    <div
      className="profile-accent-preview"
      style={accentVars(accent)}
      aria-hidden
    >
      <div className="profile-card-band">
        <span className="profile-card-avatar">{initialsOf(trimmedName)}</span>
      </div>
      <div className="profile-card-body">
        <div className="profile-card-heading">
          <span className="profile-card-name">
            {trimmedName || 'Your profile'}
          </span>
        </div>
        {trimmedTagline && (
          <div className="profile-card-tagline">{trimmedTagline}</div>
        )}
      </div>
    </div>
  );
}

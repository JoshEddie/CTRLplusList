import AltvatarPreview from '@/app/ui/components/altvatar/AltvatarPreview';
import ProfileAvatar, { facelessView } from '@/app/ui/components/ProfileAvatar';
import type { Persona } from './utils';

export default function PersonaDisc({ persona }: { persona: Persona }) {
  return persona.look ? (
    <AltvatarPreview
      styleId={persona.look.style}
      options={persona.look.options}
      accent={persona.accent}
    />
  ) : (
    <ProfileAvatar profile={facelessView(persona.name)} />
  );
}

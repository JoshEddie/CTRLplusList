'use client';

import { Button } from '@/app/ui/components/button';
import { FieldError } from '@/app/ui/components/field';
import { useUnsavedChanges } from '@/app/ui/components/ProfileSwitchProvider';
import { updateProfileSettings } from '@/lib/data/profile.actions';
import type { ProfileCardView } from '@/lib/types';
import type { ActionResponse } from '@/lib/types';
import { useActionState, useState } from 'react';
import toast from 'react-hot-toast';
import ProfileFields from './ProfileFields';
import ProfileSpaceIdentity from './ProfileSpaceIdentity';

const initialState: ActionResponse = { success: false, message: '' };

export default function ProfileSettingsForm({
  profile,
  suggestedAccent,
  readOnly,
}: {
  profile: ProfileCardView;
  /** The stored preset name, or one rolled for a profile carrying none. */
  suggestedAccent: string;
  readOnly: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [tagline, setTagline] = useState(profile.tagline ?? '');
  const [accent, setAccent] = useState<string>(suggestedAccent);

  // Compared against what was last written rather than against the props: a
  // save revalidates the route, and until that render lands the props still
  // carry the old values, which would read as unsaved changes.
  const [saved, setSaved] = useState({
    name: profile.name,
    tagline: profile.tagline ?? '',
    accent: suggestedAccent,
  });
  useUnsavedChanges(
    name !== saved.name || tagline !== saved.tagline || accent !== saved.accent
  );

  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async () => {
    const result = await updateProfileSettings(profile.id, {
      name,
      tagline,
      accent,
    });
    if (result.success) {
      toast.success(result.message);
      setSaved({ name, tagline, accent });
    } else toast.error(result.message);
    return result;
  }, initialState);

  return (
    <>
      <ProfileSpaceIdentity profile={profile} accent={accent} />
      <form action={formAction} className="profile-settings-form">
        <h2 className="profile-settings-heading">Settings</h2>
        {state.message && !state.success && (
          <FieldError>{state.message}</FieldError>
        )}
        <ProfileFields
          name={name}
          onNameChange={setName}
          tagline={tagline}
          onTaglineChange={setTagline}
          accent={accent}
          onAccentChange={setAccent}
          disabled={readOnly || isPending}
          errors={state.errors}
        />
        {/* A manager gets no submit control at all rather than a disabled one:
          the action rejects them regardless, and a greyed button invites a
          click that can only fail. */}
        {!readOnly && (
          <div className="profile-settings-actions">
            <Button type="submit" variant="primary" isLoading={isPending}>
              Save Changes
            </Button>
          </div>
        )}
      </form>
    </>
  );
}

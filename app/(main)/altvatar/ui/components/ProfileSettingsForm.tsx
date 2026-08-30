'use client';

import type { AltvatarDraft } from '@/app/ui/components/altvatar/AltvatarCustomizer';
import AltvatarCustomizer from '@/app/ui/components/altvatar/AltvatarCustomizer';
import { Button } from '@/app/ui/components/button';
import { FieldError } from '@/app/ui/components/field';
import { useUnsavedChanges } from '@/app/ui/components/ProfileSwitchProvider';
import {
  updateProfileIdentity,
  updateProfileSettings,
} from '@/lib/data/profile.actions';
import type { ProfileCardView } from '@/lib/types';
import type { ActionResponse } from '@/lib/types';
import { useActionState, useState } from 'react';
import toast from 'react-hot-toast';
import ProfileFields from './ProfileFields';
import ProfileSpaceIdentity from './ProfileSpaceIdentity';
import ProfileSpaceTabs from '@/app/(main)/altvatar/[id]/ProfileSpaceTabs';
import '@/app/ui/styles/form-shell.css';

const initialState: ActionResponse = { success: false, message: '' };

export default function ProfileSettingsForm({
  profile,
  draft,
  readOnly,
  permissionsPanel,
  listsPanel,
  identityActions,
}: {
  profile: ProfileCardView;
  /** The profile's stored face and colour, or a roll where it carries none.
      Null for a viewer who cannot submit — nothing is suggested to someone who
      could not save it. */
  draft: AltvatarDraft | null;
  readOnly: boolean;
  /** The Permissions tab's already-rendered panel, for a managed profile. The
      strip renders here rather than around this component because the identity
      header sits above the tabs and shares this component's Altvatar state. */
  permissionsPanel?: React.ReactNode;
  /** The profile's own lists, already rendered. */
  listsPanel?: React.ReactNode;
  /** Header-right slot — the invite control for a managed profile. */
  identityActions?: React.ReactNode;
}) {
  const [name, setName] = useState(profile.name);
  const [tagline, setTagline] = useState(profile.tagline ?? '');
  const [altvatar, setAltvatar] = useState(draft);
  const [customizing, setCustomizing] = useState(false);

  // Compared against what was last written rather than against the props: a
  // save revalidates the route, and until that render lands the props still
  // carry the old values, which would read as unsaved changes.
  const [saved, setSaved] = useState({
    name: profile.name,
    tagline: profile.tagline ?? '',
    altvatar: draft,
  });
  // The two commits are tracked apart because only one of them has a submit
  // control to gate. The Altvatar half is dirty only where its own write failed,
  // and there is nothing to press for it — but it is still an unsaved edit, so
  // it holds a profile switch just as an edited field does.
  const fieldsDirty = name !== saved.name || tagline !== saved.tagline;
  useUnsavedChanges(
    fieldsDirty ||
      JSON.stringify(altvatar) !== JSON.stringify(saved.altvatar)
  );

  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async () => {
    const result = await updateProfileSettings(profile.id, { name, tagline });
    if (result.success) {
      toast.success(result.message);
      setSaved((s) => ({ ...s, name, tagline }));
    } else toast.error(result.message);
    return result;
  }, initialState);

  // Confirming the customizer is a commit, not a staged edit: it closes over a
  // face the viewer has decided on, and leaving the page is how they expect to
  // leave a decision made. Its own action rather than the form's, so a face
  // committed here is not re-rendered and re-written by every later field
  // submit. A failure leaves the draft in `altvatar` with `saved` behind it,
  // which is what keeps the form dirty and the choice recoverable.
  const saveAltvatar = async (next: AltvatarDraft) => {
    const result = await updateProfileIdentity(profile.id, {
      accent: next.accent,
      altvatar: { style: next.style, options: next.options },
    });
    if (result.success) {
      toast.success(result.message);
      setSaved((s) => ({ ...s, altvatar: next }));
    } else toast.error(result.message);
  };

  const settingsForm = (
    <form action={formAction} className="form-shell-body profile-settings-form">
      {state.message && !state.success && (
        <FieldError>{state.message}</FieldError>
      )}
      <ProfileFields
        name={name}
        onNameChange={setName}
        tagline={tagline}
        onTaglineChange={setTagline}
        disabled={readOnly || isPending}
        errors={state.errors}
      />
      {/* Present and disabled for a manager rather than absent: the surface
          states that saving exists and that this viewer does not hold it.
          Disabled on an unchanged form for everyone else, since the fields are
          the only thing this control still commits. */}
      <div className="form-shell-ft-right">
        <Button
          type="submit"
          variant="primary"
          isLoading={isPending}
          disabled={readOnly || !fieldsDirty}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <ProfileSpaceIdentity
        profile={profile}
        altvatar={altvatar}
        onEdit={() => setCustomizing(true)}
        editDisabled={readOnly}
        actions={identityActions}
      />
      <ProfileSpaceTabs
        // Settings first, per `profiles-surface`: the Permissions section
        // renders *after* the Settings form, and the strip is where that
        // ordering now lives.
        panels={[
          { id: 'settings', label: 'Settings', content: settingsForm },
          ...(permissionsPanel
            ? [
                {
                  id: 'permissions',
                  label: 'Permissions',
                  content: permissionsPanel,
                },
              ]
            : []),
          { id: 'lists', label: 'Lists', content: listsPanel },
        ]}
      />
      {/* Both conditions are the same one: the customizer opens from an
          affordance that only a viewer holding a draft is given. */}
      {customizing && altvatar && (
        <AltvatarCustomizer
          value={altvatar}
          onConfirm={(next) => {
            setAltvatar(next);
            setCustomizing(false);
            void saveAltvatar(next);
          }}
          onCancel={() => setCustomizing(false)}
        />
      )}
    </>
  );
}

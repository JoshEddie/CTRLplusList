'use client';

import type { AltvatarDraft } from '@/app/ui/components/altvatar/AltvatarCustomizer';
import AltvatarField from '@/app/ui/components/altvatar/AltvatarField';
import AltvatarMark from '@/app/ui/components/altvatar/AltvatarMark';
import { Button, CloseButton } from '@/app/ui/components/button';
import { FieldError } from '@/app/ui/components/field';
import { FormShell } from '@/app/ui/components/FormShell';
import '@/app/ui/styles/altvatar.css';
import { accentVars, randomAccentName } from '@/lib/accent';
import { rollAltvatar } from '@/lib/altvatar/shuffle';
import { createProfile } from '@/lib/data/profile.actions';
import type { ActionResponse } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import toast from 'react-hot-toast';
import ProfileFields from './ProfileFields';

const initialState: ActionResponse = { success: false, message: '' };

export default function NewProfileForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  // Mounted only on the creator's click, so this never server-renders and the
  // roll cannot mismatch on hydration. Random rather than fixed: a fixed
  // opening lands every profile whose creator did not change it on one face
  // and one colour, which is the failure a generated identity exists to
  // prevent. Nothing about the roll is derived from the creating account or
  // any existing profile — the form holds neither.
  const [altvatar, setAltvatar] = useState<AltvatarDraft>(() => ({
    ...rollAltvatar(),
    accent: randomAccentName(),
  }));

  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async () => {
    const result = await createProfile({
      name,
      tagline,
      accent: altvatar.accent,
      altvatar: { style: altvatar.style, options: altvatar.options },
    });

    if (result.success) {
      // No success toast: the navigation is the confirmation, and a toast
      // raised into it would be discarded.
      onClose();
      router.push(`/altvatar/${result.id}`);
    } else {
      toast.error(result.message);
    }
    return result;
  }, initialState);

  return (
    // The band the customizer and the gate both wear, carrying the mark in the
    // accent the form is holding — so the colour being chosen is on the surface
    // choosing it, live from the first render. The mark is the form's own
    // label: a title beside it would name the same thing twice.
    <FormShell
      onClose={onClose}
      header={
        <div className="altvatar-hd" style={accentVars(altvatar.accent)}>
          <AltvatarMark />
          <CloseButton onClick={onClose} className="close-button--in-flow" />
        </div>
      }
    >
      <form action={formAction}>
        <div className="form-shell-body">
          <div className="avatar_new-profile">
            <AltvatarField value={altvatar} onChange={setAltvatar} />
            <p className="new-profile-explainer">
              A managed Altvatar is a list-keeper without its own sign-in — a
              child, a couple, a household. You run its lists; friends and
              family follow it like anyone else.
            </p>
          </div>
          {state.message && !state.success && (
            <FieldError>{state.message}</FieldError>
          )}
          <ProfileFields
            name={name}
            onNameChange={setName}
            tagline={tagline}
            onTaglineChange={setTagline}
            disabled={isPending}
            errors={state.errors}
          />
        </div>

        <div className="altvatar-ft">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Create Altvatar
          </Button>
        </div>
      </form>
    </FormShell>
  );
}

'use client';

import { Button } from '@/app/ui/components/button';
import { TextField } from '@/app/ui/components/field';
import { signInUser } from '@/lib/data/user.actions';
import { getMessage } from '@/lib/i18n/utils';
import { useState } from 'react';
import ModalButtons from './ModalButtons';

export default function GuestClaimSection({
  onGuestClaim,
}: {
  onGuestClaim: (name: string) => void;
}) {
  const [guestName, setGuestName] = useState('');
  return (
    <>
      <div className="guest-purchase">
        <TextField
          label={getMessage('claim_guest_name_label')}
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder={getMessage('claim_guest_name_label')}
        />
        <ModalButtons
          primary_button_text={getMessage('claim_as_guest_label')}
          primary_button_onclick={() =>
            guestName.trim() && onGuestClaim(guestName.trim())
          }
          primary_button_disabled={!guestName.trim()}
          primary_button_disabled_with_tooltip={getMessage(
            'claim_guest_name_required'
          )}
        />
      </div>
      <form action={signInUser} className="guest-signin-footer">
        Have an account?{' '}
        <Button variant="link" type="submit">
          Sign in
        </Button>{' '}
        to claim with your profile.
      </form>
    </>
  );
}

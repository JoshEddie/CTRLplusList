import SignInButton from '@/app/(auth)/ui/components/SignInButton';
import ModalButtons from './ModalButtons';
import PurchaseFlow from './PurchaseFlow';

export default function PurchaseFlowContainer({
  user_id,
  guestName,
  setGuestName,
  handlePurchaseConfirm,
  purchaseFlow,
  setPurchaseFlow,
  user_name,
}: {
  user_id?: string | null;
  guestName: string;
  setGuestName: (name: string) => void;
  handlePurchaseConfirm: (name: string, user_purchase?: boolean) => void;
  purchaseFlow: 'initial' | 'self' | 'other' | 'guest';
  setPurchaseFlow: (flow: 'initial' | 'self' | 'other' | 'guest') => void;
  user_name?: string | null;
}) {
  const USER_PURCHASE = true;

  return (
    <>
      {!user_id ? (
        <PurchaseFlow primary_text="Sign in to track your purchases and save lists!">
          <SignInButton />
          <div className="guest-purchase">
            <p>Or continue as guest:</p>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name"
              className="guest-name-input"
            />
            <ModalButtons
              primary_button_text="Purchase as Guest"
              primary_button_onclick={() =>
                guestName && handlePurchaseConfirm(guestName)
              }
              primary_button_disabled={!guestName.trim()}
              primary_button_disabled_with_tooltip="Please enter a name to continue"
            />
          </div>
        </PurchaseFlow>
      ) : (
        <>
          {purchaseFlow === 'initial' && (
            <PurchaseFlow primary_text="Did you or someone else purchase this item?">
              <ModalButtons
                primary_button_text="I purchased it"
                primary_button_onclick={() => setPurchaseFlow('self')}
                secondary_button_text="Someone else"
                secondary_button_onclick={() => setPurchaseFlow('other')}
              />
            </PurchaseFlow>
          )}

          {purchaseFlow === 'self' && (
            <PurchaseFlow
              primary_text={`Confirm purchase for ${user_name}`}
            >
              <ModalButtons
                primary_button_text="Confirm Purchase"
                primary_button_onclick={() =>
                  user_name &&
                  handlePurchaseConfirm(user_name, USER_PURCHASE)
                }
                secondary_button_text="Back"
                secondary_button_onclick={() => setPurchaseFlow('initial')}
              />
            </PurchaseFlow>
          )}

          {purchaseFlow === 'other' && (
            <PurchaseFlow primary_text="Who purchased this item?">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Purchaser's name"
                className="guest-name-input"
              />
              <ModalButtons
                primary_button_text="Confirm Purchase"
                primary_button_onclick={() =>
                  guestName && handlePurchaseConfirm(guestName)
                }
                secondary_button_text="Back"
                secondary_button_onclick={() => setPurchaseFlow('initial')}
                primary_button_disabled={!guestName.trim()}
                primary_button_disabled_with_tooltip="Please enter a name to continue"
              />
            </PurchaseFlow>
          )}
        </>
      )}
    </>
  );
}

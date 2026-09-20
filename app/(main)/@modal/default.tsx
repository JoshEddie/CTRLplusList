// The onboarding short-circuit in ../layout.tsx drops this slot for an
// un-onboarded account, so instant-navigation validation cannot see it;
// declaring the block opts it out rather than leaving the warning standing.
export const instant = false;

export default function ModalSlotDefault() {
  return null;
}

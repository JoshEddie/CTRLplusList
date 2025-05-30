'use client';
import '@/app/ui/styles/button.css';
import { useRouter } from 'next/navigation';
import { BsArrowLeftShort } from 'react-icons/bs';
import { FaSquareCheck } from 'react-icons/fa6';
import FormButton from './FormButton';

export default function CancelSubmitButtons({
  isPending,
  isEditing,
  type,
}: {
  isPending: boolean;
  isEditing: boolean;
  type: 'List' | 'Item';
}) {
  const router = useRouter();
  return (
    <div className="form-button-group">
      <FormButton
        type="button"
        variant="secondary"
        onClick={() => router.back()}
        disabled={isPending}
      >
        <BsArrowLeftShort size={20} /> Cancel
      </FormButton>
      <FormButton type="submit" variant="primary" disabled={isPending}>
        <FaSquareCheck /> {isEditing ? 'Update ' + type : 'Create ' + type}
      </FormButton>
    </div>
  );
}

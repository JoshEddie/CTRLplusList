'use client';
import '@/app/ui/styles/button.css';
import { FaCheck } from 'react-icons/fa6';
import TooltipWrapper from '../TooltipWrapper';
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
  return (
    <div className="form-button-group">
      <TooltipWrapper tooltip="Form is missing required fields or has invalid values" showTooltip={isPending}>
        <FormButton type="submit" variant="primary" disabled={isPending}>
          <FaCheck /> {isEditing ? 'Update ' + type : 'Create ' + type}
        </FormButton>
      </TooltipWrapper>
    </div>
  );
}

import TooltipWrapper from '@/app/ui/components/TooltipWrapper';

export default function ModalButtons({
  primary_button_text,
  primary_button_onclick,
  secondary_button_text,
  secondary_button_onclick,
  primary_button_disabled,
  primary_button_disabled_with_tooltip,
  secondary_button_disabled,
  secondary_button_disabled_with_tooltip,
}: {
  primary_button_text: string;
  primary_button_onclick: () => void;
  secondary_button_text?: string;
  secondary_button_onclick?: () => void;
  primary_button_disabled?: boolean;
  primary_button_disabled_with_tooltip?: string;
  secondary_button_disabled?: boolean;
  secondary_button_disabled_with_tooltip?: string;
}) {
  const primaryButton = (
    <button
      type="button"
      className="btn primary"
      onClick={primary_button_onclick}
      disabled={primary_button_disabled || !!primary_button_disabled_with_tooltip}
    >
      {primary_button_text}
    </button>
  );

  const secondaryButton = (
    <button
      type="button"
      className="btn secondary"
      onClick={secondary_button_onclick}
      disabled={secondary_button_disabled || !!secondary_button_disabled_with_tooltip}
    >
      {secondary_button_text}
    </button>
  );

  return (
    <div className={`button-group ${secondary_button_text ? '' : 'single'}`}>
      {secondary_button_text && 
          <TooltipWrapper
            tooltip={secondary_button_disabled_with_tooltip}
            showTooltip={!!secondary_button_disabled_with_tooltip}
          >
            {secondaryButton}
          </TooltipWrapper>
        }
      {primary_button_disabled_with_tooltip && (
        <TooltipWrapper
          tooltip={primary_button_disabled_with_tooltip}
          showTooltip={!!primary_button_disabled_with_tooltip}
        >
          {primaryButton}
        </TooltipWrapper>
      )}
    </div>
  );
}

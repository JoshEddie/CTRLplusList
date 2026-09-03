import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from '../Stepper';

function mountStepper(
  props: Partial<Parameters<typeof Stepper>[0]> = {},
  onChange = vi.fn()
) {
  render(
    <Stepper
      label="Quantity"
      value={2}
      max={4}
      onChange={onChange}
      {...props}
    />
  );
  return onChange;
}

describe('Stepper', () => {
  it('Rendered_LabelPointsAtTheNumberInput', () => {
    mountStepper();
    expect(screen.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue(2);
  });

  it('Rendered_TheRowIsOneNamedGroup', () => {
    mountStepper();
    expect(screen.getByRole('group', { name: 'Quantity' })).toBeInTheDocument();
  });

  it('StepButtonsPressed_ValueMovesOneAtATime', () => {
    const onChange = mountStepper();
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
    expect(onChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('JumpButtonsPressed_ValueLandsOnTheBound', () => {
    const onChange = mountStepper();
    fireEvent.click(screen.getByRole('button', { name: 'Set to maximum, 4' }));
    expect(onChange).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: 'Set to minimum, 1' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('AtMinimum_LoweringEndsAreDisabled', () => {
    mountStepper({ value: 1 });
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Set to minimum, 1' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase' })).toBeEnabled();
  });

  it('AtMaximum_RaisingEndsAreDisabled', () => {
    mountStepper({ value: 4 });
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Set to maximum, 4' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeEnabled();
  });

  it('TypedNumberAboveTheCeiling_ValueIsClamped', () => {
    const onChange = mountStepper();
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '9' },
    });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('FieldCleared_ValueFallsBackToOne', () => {
    const onChange = mountStepper();
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('FractionTyped_ValueIsAWholeNumber', () => {
    const onChange = mountStepper();
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '2.7' },
    });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('ClearedThenTyped_TheDigitsTypedAreTheValue', async () => {
    const user = userEvent.setup();
    const onChange = mountStepper({ value: 6, max: 99 });
    const input = screen.getByRole('spinbutton');

    await user.clear(input);
    await user.type(input, '12');

    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it('TypedThenBlurred_TheFieldShowsTheSettledValue', async () => {
    const user = userEvent.setup();
    mountStepper({ value: 2, max: 4 });
    const input = screen.getByRole('spinbutton');

    await user.type(input, '9');
    expect(input).toHaveValue(29);

    await user.tab();
    expect(input).toHaveValue(2);
  });

  it('StatusGiven_ItIsAnnouncedBesideTheLabel', () => {
    mountStepper({ status: '2 of 6 claimed' });
    expect(screen.getByRole('status')).toHaveTextContent('2 of 6 claimed');
  });

  it('DescriptionGiven_TheInputIsDescribedByIt', () => {
    mountStepper({ description: 'Just for this list' });
    expect(screen.getByRole('spinbutton')).toHaveAccessibleDescription(
      'Just for this list'
    );
  });

  it('NoDescription_TheInputCarriesNoDescriptionAssociation', () => {
    mountStepper();
    expect(screen.getByRole('spinbutton')).not.toHaveAttribute(
      'aria-describedby'
    );
  });

  it('Rendered_TheBoundsAreOnTheJumpButtonsThemselves', () => {
    mountStepper({ max: 99 });
    expect(
      screen.getByRole('button', { name: 'Set to maximum, 99' })
    ).toHaveTextContent('99');
    expect(
      screen.getByRole('button', { name: 'Set to minimum, 1' })
    ).toHaveTextContent('1');
  });
});

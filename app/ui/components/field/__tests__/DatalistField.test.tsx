/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * DatalistField returns an <input>+<datalist> fragment where the input's
 * `list` attribute and the datalist's `id` must match. Container queries
 * are required to assert the sibling <datalist> shape and id pairing.
 */
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DatalistField } from '../DatalistField';

const optionFragment = (
  <>
    <option value="A" />
    <option value="B" />
  </>
);

describe('DatalistField', () => {
  describe('DomShape', () => {
    it('Default_RendersInputPlusDatalist', () => {
      const { container } = render(
        <DatalistField name="occ" options={optionFragment} />
      );
      const input = container.querySelector(
        'input.form_field_input'
      ) as HTMLInputElement;
      const datalist = container.querySelector('datalist') as HTMLDataListElement;
      expect(input).not.toBeNull();
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('name', 'occ');
      expect(datalist).not.toBeNull();
      expect(input.getAttribute('list')).toBe(datalist.id);
    });
  });

  describe('GeneratedId', () => {
    it('ListIdMatchesDatalistId_NonEmpty', () => {
      const { container } = render(
        <DatalistField options={optionFragment} />
      );
      const input = container.querySelector(
        'input.form_field_input'
      ) as HTMLInputElement;
      const listAttr = input.getAttribute('list') ?? '';
      expect(listAttr).not.toBe('');
    });

    it('MultipleDatalistFields_HaveDistinctIds', () => {
      const { container } = render(
        <>
          <DatalistField options={optionFragment} />
          <DatalistField options={optionFragment} />
        </>
      );
      const inputs = container.querySelectorAll(
        'input.form_field_input'
      ) as NodeListOf<HTMLInputElement>;
      const datalists = container.querySelectorAll(
        'datalist'
      ) as NodeListOf<HTMLDataListElement>;
      expect(inputs).toHaveLength(2);
      expect(datalists).toHaveLength(2);
      expect(inputs[0].getAttribute('list')).toBe(datalists[0].id);
      expect(inputs[1].getAttribute('list')).toBe(datalists[1].id);
      expect(datalists[0].id).not.toBe(datalists[1].id);
    });
  });

  describe('OptionsLocation', () => {
    it('OptionsRendered_InsideDatalist', () => {
      const { container } = render(
        <DatalistField options={optionFragment} />
      );
      const datalist = container.querySelector('datalist') as HTMLDataListElement;
      const input = container.querySelector(
        'input.form_field_input'
      ) as HTMLInputElement;
      const optsInDatalist = datalist.querySelectorAll('option');
      expect(optsInDatalist).toHaveLength(2);
      expect(input.querySelectorAll('option')).toHaveLength(0);
    });
  });

  describe('RefForwarding', () => {
    it('Ref_ResolvesToInputElement', () => {
      const ref = createRef<HTMLInputElement>();
      render(<DatalistField ref={ref} options={optionFragment} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveClass('form_field_input');
    });
  });

  describe('PropPassthrough', () => {
    it('DisabledTrue_ForwardedToInput', () => {
      render(
        <DatalistField label="Occ" options={optionFragment} disabled />
      );
      expect(screen.getByLabelText('Occ')).toBeDisabled();
    });
  });

  describe('WrapperForwarding', () => {
    it('LabelErrorRequiredIcon_ForwardedToFormField', () => {
      const { container } = render(
        <DatalistField
          label="Occ"
          error="Required"
          required
          icon={<svg data-testid="i" />}
          options={optionFragment}
        />
      );
      expect(container.querySelector('.form_field_label')?.textContent).toMatch(
        /Occ/
      );
      expect(container.querySelector('.field_error')?.textContent).toBe(
        'Required'
      );
      const input = screen.getByLabelText(/Occ/);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(
        container.querySelector('.form_field [data-testid="i"]')
      ).not.toBeNull();
    });
  });
});

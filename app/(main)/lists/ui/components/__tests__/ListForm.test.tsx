import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createList, updateList } from '@/app/actions/lists';
import ListForm from '../ListForm';
import { makeList } from './test-helpers';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}));

vi.mock('@/app/actions/lists', () => ({
  createList: vi.fn(),
  updateList: vi.fn(),
  deleteList: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function nameField() {
  return screen.getByRole('textbox', { name: 'Name' });
}
function dateField() {
  return screen.getByLabelText(/Date/);
}
function submitForm() {
  // fireEvent.submit bypasses the constraint validation a real submit-button
  // click would run, so the action executes even with an empty date —
  // exercising the form's own client-side date guard.
  // eslint-disable-next-line testing-library/no-node-access
  fireEvent.submit(document.querySelector('form')!);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createList).mockResolvedValue({ success: true, id: 'new-1' } as never);
  vi.mocked(updateList).mockResolvedValue({
    success: true,
    id: 'list-1',
  } as never);
});

describe('ListForm', () => {
  describe('Create', () => {
    it('ValidSubmit_CallsCreateListWithTrimmedSubtitleNull-NavigatesToChooseItems', async () => {
      const user = userEvent.setup();
      render(<ListForm />);

      await user.type(nameField(), 'Gifts');
      await user.type(screen.getByRole('textbox', { name: 'Subtitle' }), '   ');
      await user.type(
        screen.getByRole('combobox', { name: 'Occasion' }),
        'Birthday'
      );
      fireEvent.change(dateField(), { target: { value: '2030-05-01' } });
      await user.click(screen.getByRole('button', { name: 'Create List' }));

      await waitFor(() =>
        expect(createList).toHaveBeenCalledWith({
          name: 'Gifts',
          subtitle: null,
          occasion: 'Birthday',
          date: new Date('2030-05-01'),
        })
      );
      expect(router.push).toHaveBeenCalledWith(
        '/lists/new-1/choose-items?new=1'
      );
      expect(updateList).not.toHaveBeenCalled();
    });
  });

  describe('EditAsModal', () => {
    it('Success_CallsUpdateListWithEditedFields-OnSuccessThenCloseThenRefresh-NoPush', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();
      const user = userEvent.setup();
      render(
        <ListForm
          list={makeList({ subtitle: 'For the family', occasion: 'Birthday' })}
          isEditing
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Update List' }));

      await waitFor(() =>
        expect(updateList).toHaveBeenCalledWith('list-1', {
          name: 'Birthday Wishlist',
          subtitle: 'For the family',
          occasion: 'Birthday',
          date: new Date('2030-01-01'),
        })
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(router.refresh).toHaveBeenCalledTimes(1);
      expect(router.push).not.toHaveBeenCalled();
      // onSuccess → onClose → router.refresh, in that order.
      expect(onSuccess.mock.invocationCallOrder[0]).toBeLessThan(
        onClose.mock.invocationCallOrder[0]
      );
      expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
        router.refresh.mock.invocationCallOrder[0]
      );
    });
  });

  describe('EditAsPage', () => {
    it('Success_CallsUpdateList-NavigatesToList-NoRefresh', async () => {
      const user = userEvent.setup();
      render(<ListForm list={makeList()} isEditing />);

      await user.click(screen.getByRole('button', { name: 'Update List' }));

      await waitFor(() =>
        expect(updateList).toHaveBeenCalledWith('list-1', {
          name: 'Birthday Wishlist',
          subtitle: null,
          occasion: '',
          date: new Date('2030-01-01'),
        })
      );
      expect(router.push).toHaveBeenCalledWith('/lists/list-1');
      expect(router.refresh).not.toHaveBeenCalled();
    });
  });

  describe('Failure', () => {
    it('FailedResult_KeepsFormMounted-RendersMessage-NoNavigation', async () => {
      vi.mocked(createList).mockResolvedValue({
        success: false,
        message: 'Name already taken',
      } as never);
      const user = userEvent.setup();
      render(<ListForm />);

      await user.type(nameField(), 'Gifts');
      fireEvent.change(dateField(), { target: { value: '2030-05-01' } });
      await user.click(screen.getByRole('button', { name: 'Create List' }));

      expect(
        await screen.findByText('Name already taken')
      ).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: 'Create List' })
      ).toBeInTheDocument();
    });

    it('ActionThrowsWithMessage_RendersThrownMessage-NoNavigation', async () => {
      vi.mocked(createList).mockRejectedValue(new Error('Network down'));
      const user = userEvent.setup();
      render(<ListForm />);

      await user.type(nameField(), 'Gifts');
      fireEvent.change(dateField(), { target: { value: '2030-05-01' } });
      await user.click(screen.getByRole('button', { name: 'Create List' }));

      expect(await screen.findByText('Network down')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('ActionThrowsWithoutMessage_RendersGenericError', async () => {
      vi.mocked(createList).mockRejectedValue(new Error(''));
      const user = userEvent.setup();
      render(<ListForm />);

      await user.type(nameField(), 'Gifts');
      fireEvent.change(dateField(), { target: { value: '2030-05-01' } });
      await user.click(screen.getByRole('button', { name: 'Create List' }));

      expect(await screen.findByText('An error occurred')).toBeInTheDocument();
    });
  });

  describe('DateValidation', () => {
    it('EmptyDateSubmit_BlocksDispatch-ShowsInvalidDateError', async () => {
      render(<ListForm />);
      submitForm();
      expect(
        await screen.findByText('Please enter a valid date')
      ).toBeInTheDocument();
      expect(createList).not.toHaveBeenCalled();
    });

    it('YearBefore1000Change_ShowsYearError', () => {
      render(<ListForm />);
      fireEvent.change(dateField(), { target: { value: '0500-06-01' } });
      expect(
        screen.getByText('Please enter a year of 1900 or later')
      ).toBeInTheDocument();
    });

    it('ClearedDateChange_ShowsInvalidDateError', () => {
      render(<ListForm />);
      const date = dateField();
      fireEvent.change(date, { target: { value: '2030-05-01' } });
      fireEvent.change(date, { target: { value: '' } });
      expect(screen.getByText('Please enter a valid date')).toBeInTheDocument();
    });

    it('FixDateAfterFailedSubmit_SurfacesLingeringActionDateError', async () => {
      render(<ListForm />);
      submitForm();
      expect(
        await screen.findByText('Please enter a valid date')
      ).toBeInTheDocument();
      // Clearing the local dateError (a valid onChange) leaves the action's
      // returned errors.date to surface in the field.
      fireEvent.change(dateField(), { target: { value: '2030-05-01' } });
      expect(screen.getByText('Invalid date')).toBeInTheDocument();
    });
  });

  describe('RenderDetails', () => {
    it('Editing_RendersEditTitle-UpdateLabel-DeleteSlot', () => {
      render(<ListForm list={makeList()} isEditing />);
      expect(screen.getByText('Edit List')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Update List' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Delete' })
      ).toBeInTheDocument();
    });

    it('Creating_RendersNewTitle-CreateLabel-NoDeleteSlot', () => {
      render(<ListForm />);
      expect(screen.getByText('New List')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create List' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Delete' })
      ).not.toBeInTheDocument();
    });

    it('PendingSubmit_DisablesNameField', async () => {
      let resolveCreate: (v: unknown) => void = () => {};
      vi.mocked(createList).mockReturnValue(
        new Promise((r) => {
          resolveCreate = r;
        }) as never
      );
      const user = userEvent.setup();
      render(<ListForm />);

      await user.type(nameField(), 'Gifts');
      fireEvent.change(dateField(), { target: { value: '2030-05-01' } });
      await user.click(screen.getByRole('button', { name: 'Create List' }));

      await waitFor(() => expect(nameField()).toBeDisabled());

      resolveCreate({ success: true, id: 'new-1' });
      await waitFor(() => expect(router.push).toHaveBeenCalled());
    });
  });
});

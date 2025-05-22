'use client';

import { ActionResponse, signUp } from '@/app/actions/auth';
import Button from '@/app/ui/components/Button';
import { Form } from '@/app/ui/components/Form/Form';
import Header from '@/app/ui/components/Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import toast from 'react-hot-toast';

const initialState: ActionResponse = {
  success: false,
  message: '',
  errors: undefined,
};

export default function SignUpPage() {
  const router = useRouter();

  // Use useActionState hook for the form submission action
  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async (prevState: ActionResponse, formData: FormData) => {
    try {
      const result = await signUp(formData);

      // Handle successful submission
      if (result.success) {
        toast.success('Account created successfully');
        router.push('/lists');
      }

      return result;
    } catch (err) {
      return {
        success: false,
        message: (err as Error).message || 'An error occurred',
        errors: undefined,
      };
    }
  }, initialState);

  return (
    <div className="auth-container">
      <div className="auth-content">
        <Header title="Sign up" />

        <div className="auth-card">
          <Form action={formAction} className="auth-form">
            {state?.message && !state.success && (
              <div className="form-error">{state.message}</div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isPending}
                aria-describedby="email-error"
                className={`form-input ${state?.errors?.email ? 'error' : ''}`}
              />
              {state?.errors?.email && (
                <p id="email-error" className="form-error-message">
                  {state.errors.email[0]}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                disabled={isPending}
                aria-describedby="name-error"
                className={`form-input ${state?.errors?.name ? 'error' : ''}`}
              />
              {state?.errors?.name && (
                <p id="name-error" className="form-error-message">
                  {state.errors.name[0]}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                disabled={isPending}
                aria-describedby="password-error"
                className={`form-input ${state?.errors?.password ? 'error' : ''}`}
              />
              {state?.errors?.password && (
                <p id="password-error" className="form-error-message">
                  {state.errors.password[0]}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                disabled={isPending}
                aria-describedby="confirmPassword-error"
                className={`form-input ${state?.errors?.confirmPassword ? 'error' : ''}`}
              />
              {state?.errors?.confirmPassword && (
                <p id="confirmPassword-error" className="form-error-message">
                  {state.errors.confirmPassword[0]}
                </p>
              )}
            </div>
            <div className="button-group">
              <Button
                type="submit"
                isLoading={isPending}
                className="btn primary"
              >
                Create account
              </Button>
              <Link href="/" className="auth-link">
                Already have an account? Sign in
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

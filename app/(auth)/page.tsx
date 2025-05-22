'use client';

import { ActionResponse, signIn } from '@/app/actions/auth';
import Button from '@/app/ui/components/Button';
import { Form } from '@/app/ui/components/Form/Form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import toast from 'react-hot-toast';
import Header from '../ui/components/Header';

const initialState: ActionResponse = {
  success: false,
  message: '',
  errors: undefined,
};

export default function SignInPage() {
  const router = useRouter();

  // Use useActionState hook for the form submission action
  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async (prevState: ActionResponse, formData: FormData) => {
    try {
      const result = await signIn(formData);

      // Handle successful submission
      if (result.success) {
        toast.success('Signed in successfully');
        router.push('/lists');
        router.refresh();
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
    <>
      <Header title="Sign in" />

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
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
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

          <div className="button-group">
            <Button type="submit" isLoading={isPending} className="btn primary">
              Sign in
            </Button>
            <Link href="/signup" className="auth-link">
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </Form>
      </div>
    </>
  );
}

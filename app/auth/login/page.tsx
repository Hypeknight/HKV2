import Link from 'next/link';
import { authHref, safeReturnPath } from '@/lib/auth/return-path';
import AuthFeedback from '@/components/auth/AuthFeedback';
import AuthSubmit from '@/components/auth/AuthSubmit';
import { login } from '@/app/auth/actions';

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Accept old bookmarked event links while emitting only the canonical `next` key.
  const next = safeReturnPath(params.next ?? params.redirect);
  const message = params.message === 'confirmation_sent' ? 'Check your email to confirm your account, then continue signing in.' : null;
  const error = params.error === 'confirmation_failed' ? 'This confirmation link could not be completed. Try signing in or request a new confirmation email.'
    : params.error === 'sign_out_failed' ? 'Sign out could not be confirmed. Please try again.'
    : params.error ? 'Unable to sign in. Check your email and password, then try again.' : null;

  return (
    <section className="hk-auth mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-white/60">Sign in to manage venues, events, and your account.</p>
        <AuthFeedback error={error} message={message} />
        <p className="mt-4 text-sm text-white/60">All fields are required.</p>
        <form action={login} className="mt-6 space-y-4" aria-describedby={error || message ? 'auth-feedback' : undefined}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="auth-email" className="mb-2 block text-sm text-white/70">Email (required)</label>
            <input id="auth-email" autoComplete="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-2 block text-sm text-white/70">Password (required)</label>
            <input id="auth-password" autoComplete="current-password" name="password" type="password" required />
          </div>
          <AuthSubmit pendingLabel="Signing in…">Sign in</AuthSubmit>
        </form>
        <p className="mt-6 text-sm text-white/60">
          Need an account?{' '}
          <Link href={authHref('sign-up', next)} className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </section>
  );
}

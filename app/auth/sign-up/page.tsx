import Link from 'next/link';
import { authHref, safeReturnPath } from '@/lib/auth/return-path';
import AuthFeedback from '@/components/auth/AuthFeedback';
import AuthSubmit from '@/components/auth/AuthSubmit';
import { signup } from '@/app/auth/actions';

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const error = params.error ? 'Unable to create your account. Check your details and try again.' : null;

  return (
    <section className="hk-auth mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold text-white">Create your account</h1>
        <p className="mt-2 text-sm text-white/60">Create an account to save events and manage your activity.</p>
        <AuthFeedback error={error} />
        <p className="mt-4 text-sm text-white/60">All fields are required.</p>
        <form action={signup} className="mt-6 space-y-4" aria-describedby={error ? 'auth-feedback' : undefined}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="auth-display_name" className="mb-2 block text-sm text-white/70">Display name (required)</label>
            <input id="auth-display_name" autoComplete="nickname" name="display_name" required />
          </div>
          <div>
            <label htmlFor="auth-email" className="mb-2 block text-sm text-white/70">Email (required)</label>
            <input id="auth-email" autoComplete="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-2 block text-sm text-white/70">Password (required)</label>
            <input id="auth-password" autoComplete="new-password" name="password" type="password" minLength={8} required />
          </div>
          <AuthSubmit pendingLabel="Creating account…">Create account</AuthSubmit>
        </form>
        <p className="mt-6 text-sm text-white/60">
          Already have an account?{' '}
          <Link href={authHref('login', next)} className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}

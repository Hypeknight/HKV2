import Link from 'next/link';
import { login } from '@/app/auth/actions';

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '/dashboard';
  const message = typeof params.message === 'string' ? params.message : null;
  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-white/60">Sign in to manage venues, events, and your account.</p>
        {message ? <p className="mt-4 rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
        <form action={login} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="mb-2 block text-sm text-white/70">Email</label>
            <input name="email" type="email" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Password</label>
            <input name="password" type="password" required />
          </div>
          <button className="w-full rounded-full bg-accent px-6 py-3 font-semibold text-black">Sign in</button>
        </form>
        <p className="mt-6 text-sm text-white/60">
          Need an account?{' '}
          <Link href="/auth/sign-up" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </section>
  );
}

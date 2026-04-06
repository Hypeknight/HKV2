import Link from 'next/link';
import { signup } from '@/app/auth/actions';

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold text-white">Create your account</h1>
        <p className="mt-2 text-sm text-white/60">Fresh start build. No old users are migrated automatically.</p>
        {error ? <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
        <form action={signup} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">Display name</label>
            <input name="display_name" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Email</label>
            <input name="email" type="email" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Password</label>
            <input name="password" type="password" minLength={8} required />
          </div>
          <button className="w-full rounded-full bg-accent px-6 py-3 font-semibold text-black">Create account</button>
        </form>
        <p className="mt-6 text-sm text-white/60">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { submitContactForm } from './actions';

type Props = {
  searchParams?: Promise<{ sent?: string }>;
};

export default async function ContactPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const sent = params.sent === '1';

  return (
    <section className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Contact HypeKnight
        </p>

        <h1 className="mt-3 text-4xl font-black text-white">
          Get in touch
        </h1>

        <p className="mt-4 max-w-3xl text-white/70">
          Have a question about events, promotions, coupons, partnerships, or
          HypeKnight access? Send us a message and we’ll follow up.
        </p>

        <p className="mt-4 text-white/60">
          Email: contact@hypeknight.fun
        </p>
      </section>

      {sent ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-green-200">
          Your message has been sent to HypeKnight.
        </div>
      ) : null}

      <form
        action={submitContactForm}
        className="space-y-6 rounded-[2.75rem] border border-white/10 bg-white/5 p-8"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="name" label="Name" />
          <Input name="email" label="Email" type="email" required />
          <Input name="phone" label="Phone Number" />
          <Input name="subject" label="Subject" />
        </div>

        <label className="block">
          <span className="text-sm text-white/60">Message</span>
          <textarea
            name="message"
            required
            rows={7}
            placeholder="How can HypeKnight help?"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90"
        >
          Send Message
        </button>
      </form>

      <Link href="/" className="text-sm text-white/60 hover:text-accent">
        ← Back to Home
      </Link>
    </section>
  );
}

function Input({
  name,
  label,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm text-white/60">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}
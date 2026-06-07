export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Privacy
        </p>
        <h1 className="mt-3 text-5xl font-black text-white">
          Privacy Policy
        </h1>
        <p className="mt-4 text-white/50">Last updated: June 7, 2026</p>
      </div>

      <PolicySection title="1. Information We Collect">
        HypeKnight may collect account information, event submissions, event
        preferences, search activity, payment-related metadata, and platform
        usage activity.
      </PolicySection>

      <PolicySection title="2. How We Use Information">
        We use information to operate the platform, personalize event discovery,
        process event promotions, improve recommendations, prevent abuse, and
        support users.
      </PolicySection>

      <PolicySection title="3. Payments">
        Payment processing may be handled by third-party providers such as Stripe.
        HypeKnight does not store full payment card details.
      </PolicySection>

      <PolicySection title="4. External Event Sources">
        HypeKnight may display supplemental event information from external
        sources. Clicking external links may take users to third-party websites
        with their own privacy policies.
      </PolicySection>

      <PolicySection title="5. Data Access">
        Users may contact HypeKnight about account or privacy questions using the
        contact information provided on the Contact page.
      </PolicySection>

      <PolicySection title="6. Changes">
        This policy may be updated as HypeKnight grows and adds new features.
      </PolicySection>
    </section>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-white/70">{children}</p>
    </section>
  );
}
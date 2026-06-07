export default function TermsPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Terms
        </p>
        <h1 className="mt-3 text-5xl font-black text-white">
          Terms of Service
        </h1>
        <p className="mt-4 text-white/50">Last updated: June 7, 2026</p>
      </div>

      <PolicySection title="1. Use of HypeKnight">
        HypeKnight provides event discovery, event promotion, and supplemental
        external event listings. By using the platform, you agree to use it
        lawfully and responsibly.
      </PolicySection>

      <PolicySection title="2. Event Listings">
        HypeKnight may display events created by users, promoters, admins, and
        external sources. HypeKnight does not guarantee that event details are
        complete, current, or error-free. Users should verify event details before
        attending.
      </PolicySection>

      <PolicySection title="3. External Events">
        External events are supplemental listings from third-party sources.
        HypeKnight does not manage, host, sell, or control those events unless
        clearly stated otherwise.
      </PolicySection>

      <PolicySection title="4. Payments and Promotions">
        Paid event promotions are subject to approval, platform rules, coupon
        terms, and refund decisions. HypeKnight may reject, remove, or limit
        event listings that violate platform expectations.
      </PolicySection>

      <PolicySection title="5. User Accounts">
        Users are responsible for maintaining accurate account information and
        protecting their login credentials.
      </PolicySection>

      <PolicySection title="6. Prohibited Content">
        Users may not submit unlawful, misleading, abusive, hateful, infringing,
        or unsafe content.
      </PolicySection>

      <PolicySection title="7. Changes">
        HypeKnight may update these terms as the platform evolves.
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
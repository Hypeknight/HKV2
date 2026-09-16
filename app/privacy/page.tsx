export default function PrivacyPage() {
  return (
    <LegalPage title="HypeKnight Privacy Policy">
      <p>Last updated: June 16, 2026</p>

      <h2>1. Information We Collect</h2>
      <p>We may collect account information, contact information, location preferences, event activity, coupon activity, and messages submitted through forms. We may also retain information previously provided through legacy HypeKnight programs, including Ambassador applications.</p>

      <h2>2. How We Use Information</h2>
      <p>We use information to operate HypeKnight, manage accounts, review events, administer applicable transactions and coupons, respond to users, improve the platform, and maintain records associated with prior platform programs where appropriate.</p>

      <h2>3. Legacy Ambassador Information</h2>
      <p>HypeKnight previously accepted Ambassador applications that could include legal name, contact information, city, state, social handles, promotion plans, and payout readiness information. The Ambassador Program is not currently offered, but information previously submitted may be retained as appropriate for recordkeeping, legal, security, or program administration purposes.</p>

      <h2>4. Payment and Tax Information</h2>
      <p>HypeKnight may retain or process payout information when needed to address legitimate obligations associated with prior programs or other applicable payments. Sensitive tax documents should be handled carefully and collected only when necessary.</p>

      <h2>5. Sharing</h2>
      <p>We do not sell personal information. We may share information with service providers needed to operate payments, hosting, email, analytics, security, or legal compliance.</p>

      <h2>6. Contact</h2>
      <p>Questions may be sent to contact@hypeknight.fun.</p>
    </LegalPage>
  );
}

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-12 text-white/75">
      <h1 className="text-4xl font-black text-white">{title}</h1>
      <div className="space-y-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white">{children}</div>
    </section>
  );
}
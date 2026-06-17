export default function PrivacyPage() {
  return (
    <LegalPage title="HypeKnight Privacy Policy">
      <p>Last updated: June 16, 2026</p>

      <h2>1. Information We Collect</h2>
      <p>We may collect account information, contact information, location preferences, event activity, ambassador application details, coupon activity, and messages submitted through forms.</p>

      <h2>2. How We Use Information</h2>
      <p>We use information to operate HypeKnight, manage accounts, review events, process ambassador applications, track coupons, respond to users, and improve the platform.</p>

      <h2>3. Ambassador Information</h2>
      <p>Ambassador applicants may provide legal name, contact information, city, state, social handles, promotion plans, and payout readiness information.</p>

      <h2>4. Payment and Tax Information</h2>
      <p>HypeKnight may request payout information before issuing ambassador payments. Sensitive tax documents should be handled carefully and only collected when necessary.</p>

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
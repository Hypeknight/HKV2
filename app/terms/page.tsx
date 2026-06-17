export default function TermsPage() {
  return (
    <LegalPage title="HypeKnight Terms of Service">
      <p>Last updated: June 16, 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using HypeKnight, you agree to these Terms of Service.</p>

      <h2>2. Platform Purpose</h2>
      <p>HypeKnight helps users discover events and allows event owners, promoters, venues, ambassadors, and approved users to submit or promote event-related content.</p>

      <h2>3. User Accounts</h2>
      <p>Users are responsible for the accuracy of their account information and activity connected to their account.</p>

      <h2>4. Event Listings</h2>
      <p>Event submissions may require review, payment, approval, or moderation before becoming publicly visible.</p>

      <h2>5. Payments, Coupons, and Refunds</h2>
      <p>Payments, coupon use, revisions, removals, and refunds are subject to HypeKnight review and applicable policies.</p>

      <h2>6. Prohibited Conduct</h2>
      <p>Users may not submit false, misleading, unlawful, abusive, fraudulent, or infringing content.</p>

      <h2>7. No Guarantee</h2>
      <p>HypeKnight does not guarantee attendance, sales, visibility, rankings, earnings, or event outcomes.</p>

      <h2>8. Changes</h2>
      <p>HypeKnight may update these terms as the platform grows.</p>

      <h2>9. Contact</h2>
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
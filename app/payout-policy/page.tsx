export default function PayoutPolicyPage() {
  return (
    <LegalPage title="HypeKnight Payout Policy">
      <p>Last updated: June 16, 2026</p>

      <h2>1. Payout Eligibility</h2>
      <p>Ambassador commission must be marked eligible and approved before payout.</p>

      <h2>2. Minimum Threshold</h2>
      <p>HypeKnight may require a minimum payout threshold before issuing payment.</p>

      <h2>3. Tax Information</h2>
      <p>Before payout, HypeKnight may require legal name, address, payout method, and a completed W-9 or other required tax documentation.</p>

      <h2>4. Payout Methods</h2>
      <p>Initial payout methods may include PayPal, Cash App, Venmo, Zelle, or another method approved by HypeKnight.</p>

      <h2>5. Timing</h2>
      <p>Payouts may be processed manually on a schedule determined by HypeKnight.</p>

      <h2>6. Withheld or Delayed Payments</h2>
      <p>HypeKnight may delay, deny, or hold payouts for missing tax information, suspected fraud, unresolved refunds, chargebacks, policy violations, or account suspension.</p>
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
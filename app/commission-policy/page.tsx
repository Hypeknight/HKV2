export default function CommissionPolicyPage() {
  return (
    <LegalPage title="HypeKnight Commission Policy">
      <p>Last updated: June 16, 2026</p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="font-bold text-white">Legacy program document</p>
        <p className="mt-2">
          This policy describes the legacy HypeKnight Ambassador Program and
          is not an offer of a current commission program. It remains
          available for historical and reference purposes.
        </p>
      </div>

      <h2>1. Commission Basis</h2>
      <p>Ambassadors may earn 30% of HypeKnight profit from eligible sales made with their approved coupon code.</p>

      <h2>2. Profit Calculation</h2>
      <p>Profit may be calculated after discounts, payment processing fees, refunds, chargebacks, direct costs, and other approved deductions.</p>

      <h2>3. No Profit, No Commission</h2>
      <p>If a coupon discount or transaction produces no eligible profit, no commission is owed.</p>

      <h2>4. When Commission Becomes Eligible</h2>
      <p>Commission is not earned at checkout. It becomes eligible only after the referred event completes the HypeKnight promotion pipeline with no refund, removal, cancellation, fraud, or chargeback.</p>

      <h2>5. Exclusions</h2>
      <p>No commission is owed for refunded events, removed events, chargebacks, fraudulent activity, self-dealing, coupon abuse, cancelled events, or transactions HypeKnight determines are invalid.</p>

      <h2>6. Admin Review</h2>
      <p>HypeKnight may review all commission activity before marking commission eligible, approved, or paid.</p>
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
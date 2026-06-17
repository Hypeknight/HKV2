export default function AmbassadorAgreementPage() {
  return (
    <LegalPage title="HypeKnight Ambassador Program Agreement">
      <p>Last updated: June 16, 2026</p>

      <h2>1. Ambassador Status</h2>
      <p>Ambassadors are independent contractors and are not employees, partners, agents, or representatives of HypeKnight.</p>

      <h2>2. Approval Required</h2>
      <p>Submitting an application does not guarantee acceptance. HypeKnight may approve, reject, suspend, or remove ambassador access at its discretion.</p>

      <h2>3. Coupon Codes</h2>
      <p>Approved ambassadors may request custom coupon codes. HypeKnight must approve a code before it becomes active.</p>

      <h2>4. Promotional Conduct</h2>
      <p>Ambassadors must promote HypeKnight honestly and may not mislead users, create fake sales, abuse coupons, or make unauthorized promises.</p>

      <h2>5. Required Disclosures</h2>
      <p>Ambassadors must clearly disclose their relationship with HypeKnight when promoting HypeKnight, coupon codes, or compensated opportunities.</p>

      <h2>6. No Guaranteed Earnings</h2>
      <p>HypeKnight does not guarantee sales, commissions, payouts, traffic, approval, or continued access.</p>

      <h2>7. Termination</h2>
      <p>HypeKnight may suspend or remove ambassador access for fraud, abuse, misleading promotion, policy violations, or platform risk.</p>
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
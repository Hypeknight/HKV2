import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-14 border-t border-white/[0.07] bg-[#07090d] pb-20 sm:pb-0">
      <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,.6fr)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <img src="/hypeknight-logo.jpeg" alt="" className="h-full w-full object-cover" />
              </span>
              <div>
                <p className="hk-kicker">HypeKnight</p>
                <p className="mt-1 text-lg font-black text-white">Find the night that fits.</p>
              </div>
            </div>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white/40">
              Live-experience discovery built around useful choices, local context, and better signals about what people want to do next.
            </p>
          </div>

          <FooterGroup title="Discover" links={[
            ['/events', 'Events'],
            ['/venues', 'Venues'],
            ['/calendar', 'Calendar'],
            ['/events?when=tonight', 'Tonight'],
          ]} />
          <FooterGroup title="For operators" links={[
            ['/promote', 'Promote'],
            ['/pricing', 'Pricing'],
            ['/ambassadors', 'Ambassadors'],
            ['/contact', 'Contact'],
          ]} />
          <FooterGroup title="Company" links={[
            ['/about', 'About'],
            ['/privacy', 'Privacy'],
            ['/terms', 'Terms'],
            ['/commission-policy', 'Commission policy'],
          ]} />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HypeKnight. All rights reserved.</p>
          <p>External event listings are supplemental and may be managed by their original provider.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{title}</h3>
      <div className="mt-4 grid gap-2.5 text-sm">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="text-white/45 transition hover:text-accent">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-sm uppercase tracking-[0.35em] text-accent">
              HypeKnight
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white">
              Discover the night that fits you.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/60">
              HypeKnight helps users discover events, compare nightlife energy,
              and explore supplemental event listings from trusted external sources.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white">Explore</h3>
            <div className="mt-4 space-y-2 text-sm">
              <FooterLink href="/events" label="Events" />
              <FooterLink href="/events/recommended" label="Recommended" />
              <FooterLink href="/dashboard" label="Dashboard" />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white">Company</h3>
            <div className="mt-4 space-y-2 text-sm">
              <FooterLink href="/about" label="About" />
              <FooterLink href="/contact" label="Contact" />
              <FooterLink href="/terms" label="Terms of Service" />
              <FooterLink href="/privacy" label="Privacy Policy" />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HypeKnight. All rights reserved.</p>
          <p>External events are supplemental and not managed by HypeKnight.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block text-white/60 hover:text-accent">
      {label}
    </Link>
  );
}
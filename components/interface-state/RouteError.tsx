'use client';
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-5xl px-4 py-10 text-white">
    <h2 className="text-xl font-semibold">This page is temporarily unavailable.</h2>
    <p className="mt-2">We could not retrieve the information needed to display this page.</p>
    <button onClick={reset} className="mt-4 text-accent">Try again</button>
  </section>;
}

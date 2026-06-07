export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-sm uppercase tracking-[0.35em] text-accent">About</p>
      <h1 className="mt-3 text-5xl font-black text-white">About HypeKnight</h1>
      <p className="mt-6 text-white/70">
        HypeKnight is an event discovery platform built to help users find events
        by city, timing, vibe, music, and source. The platform supports native
        HypeKnight events as well as supplemental listings from external sources.
      </p>
      <p className="mt-4 text-white/70">
        Our goal is to make nightlife and event discovery feel more personalized,
        easier to scan, and more useful for people deciding where their night
        should start.
      </p>
    </section>
  );
}
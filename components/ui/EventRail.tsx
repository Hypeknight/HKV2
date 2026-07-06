import EventCard from './EventCard';
import EmptyState from './EmptyState';
import SectionHeader from './SectionHeader';

export default function EventRail({
  id,
  eyebrow,
  title,
  text,
  events,
  emptyText = 'No events are showing yet.',
  href,
  action,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  text?: string;
  events: any[];
  emptyText?: string;
  href?: string;
  action?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        text={text}
        href={href}
        action={action}
      />

      {events.length ? (
        <>
          <p className="mt-4 text-sm text-white/45 sm:hidden">
            {events.length} showing • Swipe to browse →
          </p>

          <div className="relative">
            <div className="-mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard
                  key={`${event.source_label || event.source || 'event'}-${event.id}`}
                  event={event}
                  compact
                />
              ))}
            </div>

            <div className="pointer-events-none absolute right-0 top-5 h-[calc(100%-1.25rem)] w-12 bg-gradient-to-l from-black to-transparent sm:hidden" />
          </div>
        </>
      ) : (
        <div className="mt-5 sm:mt-8">
          <EmptyState text={emptyText} />
        </div>
      )}
    </section>
  );
}
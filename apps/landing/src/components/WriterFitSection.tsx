import type { ReactElement } from 'react';

const WRITER_FITS = [
  {
    title: 'You write long projects, not status updates.',
    body: 'Books, essays, chapters, scenes, and notes can live beside each other without turning the app into an admin dashboard.',
  },
  {
    title: 'Your first draft is allowed to be messy.',
    body: 'Quick Drafts catches fragments before they have a home. Structure can wait until the work starts showing you what it is.',
  },
  {
    title: 'Cloud backup should not be a trust fall.',
    body: 'Goyo saves locally first and is designed for sync that preserves changes instead of picking the newest copy as the winner.',
  },
] as const;

export function WriterFitSection(): ReactElement {
  return (
    <section className="border-[var(--goyo-border)] border-b bg-[var(--goyo-app)] px-5 py-18 sm:px-8 lg:px-12 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="goyo-reveal max-w-xl">
          <p className="font-medium text-[0.7rem] uppercase tracking-[0.22em] text-[var(--goyo-text-faint)]">
            Made for writers who draft slowly
          </p>
          <h2 className="goyo-prose mt-3 text-[2.1rem] leading-tight tracking-[-0.05em] text-[var(--goyo-text)] sm:text-[2.6rem]">
            A workspace for the in-between state of writing.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:gap-5">
          {WRITER_FITS.map((item, index) => (
            <article
              className={`rounded-2xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] p-6 shadow-[0_18px_60px_-46px_rgba(31,29,25,0.4)] ${
                index === 0
                  ? 'goyo-reveal'
                  : index === 1
                    ? 'goyo-reveal-lag-1'
                    : 'goyo-reveal-lag-2'
              }`}
              key={item.title}
            >
              <h3 className="goyo-prose text-[1.25rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--goyo-text)]">
                {item.title}
              </h3>
              <p className="mt-4 text-[0.9rem] leading-relaxed text-[var(--goyo-text-muted)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

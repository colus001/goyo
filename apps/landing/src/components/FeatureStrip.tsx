import type { ReactElement } from 'react';

const ITEMS = [
  { caption: 'writes stay on disk first', title: 'Local-first by default' },
  { caption: 'merges, never last-write-wins', title: 'Yjs CRDT safe' },
  { caption: 'pick the paper that fits the hour', title: 'Six built-in themes' },
];

export function FeatureStrip(): ReactElement {
  return (
    <section
      aria-label="Highlights"
      className="border-y border-[var(--goyo-border)] bg-[var(--goyo-paper)]"
    >
      <div className="mx-auto grid max-w-7xl divide-y divide-[var(--goyo-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {ITEMS.map((item, index) => (
          <div
            className={`goyo-reveal flex items-baseline gap-3 px-6 py-5 sm:px-8 lg:px-10 ${
              index === 0 ? 'goyo-reveal' : index === 1 ? 'goyo-reveal-lag-1' : 'goyo-reveal-lag-2'
            }`}
            key={item.title}
          >
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 translate-y-[-2px] rounded-full bg-[var(--goyo-accent)]"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-[0.7rem] uppercase tracking-[0.18em] text-[var(--goyo-text-muted)]">
                {item.title}
              </span>
              <span className="mt-1 text-[0.78rem] text-[var(--goyo-text-faint)]">
                {item.caption}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import type { ReactElement } from 'react';
import { roadmap } from '../lib/data';

const ROADMAP_ACCENTS = ['#4f6f64', '#b68243', '#52697f'] as const;
const REVEAL_LAG = ['goyo-reveal', 'goyo-reveal-lag-1', 'goyo-reveal-lag-2'] as const;

export function RoadmapSection(): ReactElement {
  return (
    <section
      className="border-[var(--goyo-border)] border-t bg-[var(--goyo-paper)] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      id="roadmap"
    >
      <div className="mx-auto max-w-7xl">
        <div className="goyo-reveal mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-medium text-[0.7rem] uppercase tracking-[0.22em] text-[var(--goyo-text-faint)]">
              Roadmap
            </p>
            <h2 className="goyo-prose mt-3 max-w-xl text-[2.1rem] leading-tight tracking-[-0.05em] text-[var(--goyo-text)] sm:text-[2.6rem]">
              Desktop first. Cloud next. Mobile soon.
            </h2>
          </div>
          <p className="max-w-md text-[0.95rem] leading-relaxed text-[var(--goyo-text-muted)]">
            The product is growing from a reliable desktop writing surface toward safe sync,
            recovery, exports, and mobile access.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {roadmap.map((entry, index) => (
            <article
              className={`flex h-full flex-col gap-4 rounded-2xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] p-6 transition-colors hover:bg-[var(--goyo-raised)] lg:p-7 ${
                REVEAL_LAG[index] ?? 'goyo-reveal-lag-3'
              }`}
              key={entry.phase}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: ROADMAP_ACCENTS[index] }}
                />
                <span className="font-semibold text-[0.66rem] uppercase tracking-[0.18em] text-[var(--goyo-text-faint)]">
                  {entry.phase}
                </span>
              </div>
              <h3 className="goyo-prose text-[1.4rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--goyo-text)]">
                {entry.title}
              </h3>
              <p className="text-[0.9rem] leading-relaxed text-[var(--goyo-text-muted)]">
                {entry.items}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

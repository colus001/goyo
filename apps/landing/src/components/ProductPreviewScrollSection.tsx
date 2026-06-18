import type { ReactElement } from 'react';
import { BackgroundDecoration } from '../lib/BackgroundDecoration';
import { RealWritingShellPreview } from './previews/RealWritingShellPreview';

export function ProductPreviewScrollSection(): ReactElement {
  return (
    <section className="relative overflow-x-clip border-[var(--goyo-border)] border-b bg-[var(--goyo-paper)] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <BackgroundDecoration className="goyo-parallax-fast" variant="dot-grid" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="goyo-reveal font-medium text-[0.7rem] uppercase tracking-[0.22em] text-[var(--goyo-text-faint)]">
            Product preview
          </p>
          <h2 className="goyo-reveal goyo-reveal-lag-1 goyo-prose mt-3 text-[2.35rem] leading-tight tracking-[-0.055em] text-[var(--goyo-text)] sm:text-[3rem]">
            The same writing surface, without another mockup.
          </h2>
        </div>

        <div className="goyo-product-stage relative mx-auto mt-14 max-w-6xl">
          <FloatingProductNote
            className="-top-6 left-4 hidden md:block"
            kicker="Sidebar"
            title="Chapters stay close"
          />
          <FloatingProductNote
            className="right-4 -bottom-6 hidden lg:block"
            kicker="Focus"
            title="The page stays empty until you write"
          />
          <RealWritingShellPreview className="h-[34rem] max-sm:h-[29rem]" />
        </div>
      </div>
    </section>
  );
}

function FloatingProductNote({
  className,
  kicker,
  title,
}: {
  className: string;
  kicker: string;
  title: string;
}): ReactElement {
  return (
    <aside
      className={`pointer-events-none absolute z-20 max-w-[17rem] rounded-2xl border border-[var(--goyo-border)] bg-[color-mix(in_srgb,var(--goyo-paper)_94%,transparent)] px-4 py-3 text-left shadow-[0_18px_42px_-28px_rgba(31,29,25,0.35)] backdrop-blur-md ${className}`}
    >
      <p className="font-medium text-[0.62rem] uppercase tracking-[0.18em] text-[var(--goyo-text-faint)]">
        {kicker}
      </p>
      <p className="mt-1 text-[0.84rem] font-semibold tracking-[-0.02em] text-[var(--goyo-text)]">
        {title}
      </p>
    </aside>
  );
}

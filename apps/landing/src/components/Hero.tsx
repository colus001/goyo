import { Download } from 'lucide-react';
import type { ReactElement } from 'react';
import { BackgroundDecoration } from '../lib/BackgroundDecoration';
import { downloadLinks } from '../lib/data';
import { RealWritingShellPreview } from './previews/RealWritingShellPreview';

export function Hero(): ReactElement {
  return (
    <section
      className="relative overflow-x-clip border-[var(--goyo-border)] border-b bg-[var(--goyo-app)]"
      id="top"
    >
      <BackgroundDecoration className="goyo-parallax-slow" variant="g-mark" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-5 pt-16 pb-10 text-center sm:px-8 sm:pt-20 lg:px-12 lg:pt-24">
        <div className="flex max-w-4xl flex-col items-center">
          <div className="goyo-reveal mb-7 flex flex-wrap justify-center gap-2">
            {['Free local writing', 'Open source', 'Cloud sync coming soon'].map((badge) => (
              <span
                className="rounded-full border border-[var(--goyo-border)] bg-[var(--goyo-paper)] px-2.5 py-1 font-medium text-[0.66rem] uppercase tracking-[0.16em] text-[var(--goyo-text-muted)]"
                key={badge}
              >
                {badge}
              </span>
            ))}
          </div>
          <p className="goyo-reveal goyo-reveal-lag-1 mb-5 font-medium text-[0.7rem] uppercase tracking-[0.22em] text-[var(--goyo-text-faint)]">
            Local-first writing for long work
          </p>
          <h1 className="goyo-reveal goyo-reveal-lag-1 goyo-prose max-w-4xl text-balance font-semibold text-[3rem] leading-[0.98] tracking-[-0.065em] text-[var(--goyo-text)] sm:text-[4rem] lg:text-[5.4rem]">
            For drafts that need silence, structure, and somewhere safe to grow.
          </h1>
          <p className="goyo-reveal goyo-reveal-lag-2 mt-6 max-w-2xl text-[1.02rem] leading-[1.7] text-[var(--goyo-text-muted)] sm:text-[1.08rem]">
            Capture the line before it disappears, let a messy chapter stay messy, and organize the
            work only when the shape is ready. Your words are saved locally first.
          </p>
          <div className="goyo-reveal goyo-reveal-lag-2 mt-8 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
            <a
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--goyo-accent)] px-5 py-3 font-medium text-[0.92rem] text-white transition hover:bg-[var(--goyo-accent-hover)]"
              href={downloadLinks.mac}
              rel="noreferrer"
              target="_blank"
            >
              <Download aria-hidden="true" size={15} strokeWidth={2.2} />
              Download for macOS
            </a>
            <a
              className="inline-flex items-center justify-center rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-paper)] px-5 py-3 font-medium text-[0.92rem] text-[var(--goyo-text)] transition hover:bg-[var(--goyo-raised)]"
              href="#how-it-works"
            >
              See how it works
            </a>
          </div>
          <p className="goyo-reveal goyo-reveal-lag-3 mt-5 text-[0.78rem] text-[var(--goyo-text-faint)]">
            No account required for local writing · Apple Silicon · Windows x64 · Linux
          </p>
        </div>

        <div className="relative mt-14 w-full max-w-6xl">
          <div className="goyo-parallax-fast relative mx-auto rounded-[24px] border border-[var(--goyo-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(247,247,245,0.2))] p-2 shadow-[0_42px_120px_-54px_rgba(31,29,25,0.55)] sm:p-3">
            <RealWritingShellPreview className="h-[34rem] max-sm:h-[29rem]" />
          </div>
        </div>
      </div>
    </section>
  );
}

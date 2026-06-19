import type { ReactElement } from 'react';
import { downloadLinks } from '../lib/data';

export function TopNav(): ReactElement {
  return (
    <header className="sticky top-0 z-30 border-[var(--goyo-border)] border-b bg-[var(--goyo-paper)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--goyo-paper)]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8 lg:px-12">
        <a aria-label="Goyo home" className="group flex items-center gap-3" href="#top">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-xl bg-[var(--goyo-accent)] font-semibold text-[0.9rem] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_-18px_rgba(31,29,25,0.8)] transition group-hover:scale-[1.03]"
          >
            G
          </span>
          <span className="font-semibold text-[1.28rem] leading-none tracking-[-0.055em] text-[var(--goyo-text)]">
            Goyo
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-[0.85rem] text-[var(--goyo-text-muted)] md:flex">
          <a className="transition hover:text-[var(--goyo-text)]" href="#how-it-works">
            How it works
          </a>
          <a className="transition hover:text-[var(--goyo-text)]" href="#download">
            Download
          </a>
          <a className="transition hover:text-[var(--goyo-text)]" href="#roadmap">
            Roadmap
          </a>
          <a
            className="transition hover:text-[var(--goyo-text)]"
            href={downloadLinks.repository}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </nav>
        <a
          className="inline-flex items-center justify-center rounded-full bg-[var(--goyo-accent)] px-3.5 py-2 font-medium text-[0.82rem] text-white transition hover:bg-[var(--goyo-accent-hover)]"
          href="#download"
        >
          Download
        </a>
      </div>
    </header>
  );
}

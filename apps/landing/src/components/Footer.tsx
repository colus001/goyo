import type { ReactElement } from 'react';
import { downloadLinks } from '../lib/data';

export function Footer(): ReactElement {
  return (
    <footer className="border-[var(--goyo-border)] border-t bg-[var(--goyo-app)] px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <a className="flex items-center gap-2" href="#top">
            <span
              aria-hidden="true"
              className="grid size-6 place-items-center rounded-md bg-[var(--goyo-accent)] text-[0.68rem] font-semibold text-white"
            >
              G
            </span>
            <span className="font-semibold text-[0.88rem] tracking-[-0.025em] text-[var(--goyo-text)]">
              Goyo
            </span>
          </a>
          <p className="mt-3 max-w-md text-[0.82rem] leading-relaxed text-[var(--goyo-text-muted)]">
            Built for writers who want room for fragments, chapters, notes, and long drafts without
            giving up local control.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-[0.78rem] text-[var(--goyo-text-muted)] md:items-end">
          <p>
            <a
              className="transition hover:text-[var(--goyo-text)]"
              href={downloadLinks.repository}
              rel="noreferrer"
              target="_blank"
            >
              Open source on GitHub
            </a>
          </p>
          <p>Built with Yjs, Tiptap, and Cloudflare.</p>
          <p>© {new Date().getFullYear()} Goyo. Free local writing for everyone.</p>
        </div>
      </div>
    </footer>
  );
}

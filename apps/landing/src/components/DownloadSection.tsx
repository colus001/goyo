import { Apple, Download, Globe, Monitor } from 'lucide-react';
import type { ReactElement } from 'react';
import { BackgroundDecoration } from '../lib/BackgroundDecoration';
import { downloadLinks } from '../lib/data';
import { GOYO_BOOK_ACCENT_COLORS } from '../lib/theme-tokens';

export function DownloadSection(): ReactElement {
  return (
    <section
      className="relative overflow-hidden border-[var(--goyo-border)] border-b bg-[var(--goyo-app)] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      id="download"
    >
      <BackgroundDecoration className="goyo-parallax-slow" variant="blob" />
      <div className="relative mx-auto max-w-7xl">
        <div className="goyo-reveal overflow-hidden rounded-2xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] shadow-[0_24px_80px_-32px_rgba(31,29,25,0.18)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-5 p-8 sm:p-10 lg:p-12">
              <p className="font-medium text-[0.7rem] uppercase tracking-[0.22em] text-[var(--goyo-text-faint)]">
                Download
              </p>
              <h2 className="goyo-prose text-[2.1rem] leading-tight tracking-[-0.05em] text-[var(--goyo-text)] sm:text-[2.5rem]">
                Start writing without opening an account.
              </h2>
              <p className="text-[0.95rem] leading-relaxed text-[var(--goyo-text-muted)]">
                Download the desktop app, keep your work on your machine, and add sync later when
                you want backup and access across devices.
              </p>
              <div>
                <p className="mb-2 font-medium text-[0.66rem] uppercase tracking-[0.14em] text-[var(--goyo-text-faint)]">
                  Cover color
                </p>
                <div className="flex gap-2">
                  {GOYO_BOOK_ACCENT_COLORS.map((color) => (
                    <span
                      aria-hidden="true"
                      className="size-5 rounded-full border border-black/10"
                      key={color}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-[var(--goyo-border)] border-t bg-[var(--goyo-panel)] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <DownloadLink
                accent
                href={downloadLinks.mac}
                icon={<Apple aria-hidden="true" size={15} strokeWidth={2.2} />}
                label="macOS"
                sublabel="Apple Silicon"
              />
              <DownloadLink
                href={downloadLinks.windows}
                icon={<Monitor aria-hidden="true" size={15} strokeWidth={2.2} />}
                label="Windows"
                sublabel="x64 installer"
              />
              <DownloadLink
                href={downloadLinks.linuxAppImage}
                icon={<Globe aria-hidden="true" size={15} strokeWidth={2.2} />}
                label="Linux"
                sublabel="AppImage"
              />
              <DownloadLink
                href={downloadLinks.linuxDeb}
                icon={<Globe aria-hidden="true" size={15} strokeWidth={2.2} />}
                label="Linux"
                sublabel=".deb package"
              />
              <a
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-medium text-[0.78rem] text-[var(--goyo-text-muted)] transition hover:bg-[var(--goyo-paper)] hover:text-[var(--goyo-text)]"
                href={downloadLinks.releases}
                rel="noreferrer"
                target="_blank"
              >
                <Download aria-hidden="true" size={13} strokeWidth={2.2} />
                View all releases
              </a>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-medium text-[0.78rem] text-[var(--goyo-text-muted)] transition hover:bg-[var(--goyo-paper)] hover:text-[var(--goyo-text)]"
                href={downloadLinks.repository}
                rel="noreferrer"
                target="_blank"
              >
                <Globe aria-hidden="true" size={13} strokeWidth={2.2} />
                View source on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DownloadLink({
  accent = false,
  href,
  icon,
  label,
  sublabel,
}: {
  accent?: boolean;
  href: string;
  icon: ReactElement;
  label: string;
  sublabel: string;
}): ReactElement {
  return (
    <a
      className={`flex items-center justify-between rounded-xl px-4 py-3 transition ${
        accent
          ? 'bg-[var(--goyo-accent)] text-white hover:bg-[var(--goyo-accent-hover)]'
          : 'border border-[var(--goyo-border)] bg-[var(--goyo-paper)] text-[var(--goyo-text)] hover:bg-[var(--goyo-raised)]'
      }`}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <span className="flex items-center gap-3">
        <span
          className={`grid size-8 place-items-center rounded-md ${
            accent ? 'bg-white/15 text-white' : 'bg-[var(--goyo-app)] text-[var(--goyo-text-muted)]'
          }`}
        >
          {icon}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-semibold text-[0.92rem] tracking-[-0.02em]">{label}</span>
          <span
            className={`text-[0.72rem] ${accent ? 'text-white/70' : 'text-[var(--goyo-text-muted)]'}`}
          >
            {sublabel}
          </span>
        </span>
      </span>
      <Download
        aria-hidden="true"
        className={accent ? 'text-white/70' : 'text-[var(--goyo-text-faint)]'}
        size={14}
        strokeWidth={2.2}
      />
    </a>
  );
}

import type { ReactElement } from 'react';

export type BackgroundVariant = 'blob' | 'dot-grid' | 'g-mark';

export function BackgroundDecoration({
  className = '',
  variant,
}: {
  className?: string;
  variant: BackgroundVariant;
}): ReactElement | null {
  if (variant === 'g-mark') {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      >
        <span className="goyo-prose absolute -right-16 -top-32 select-none font-semibold text-[44rem] leading-none tracking-[-0.06em] text-[var(--goyo-text-muted)] opacity-[0.14]">
          G
        </span>
      </div>
    );
  }

  if (variant === 'blob') {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      >
        <span
          aria-hidden="true"
          className="absolute -left-40 top-1/4 size-[36rem] rounded-full opacity-70 blur-2xl"
          style={{
            background:
              'radial-gradient(circle at center, var(--goyo-accent-soft) 0%, transparent 65%)',
          }}
        />
        <span
          aria-hidden="true"
          className="absolute -right-40 bottom-1/4 size-[40rem] rounded-full opacity-60 blur-2xl"
          style={{
            background:
              'radial-gradient(circle at center, color-mix(in srgb, var(--goyo-accent) 14%, transparent) 0%, transparent 65%)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-[0.18]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern height="22" id="goyo-dot-grid" patternUnits="userSpaceOnUse" width="22">
            <circle cx="1.5" cy="1.5" fill="var(--goyo-text-faint)" r="1.1" />
          </pattern>
        </defs>
        <rect fill="url(#goyo-dot-grid)" height="100%" width="100%" />
      </svg>
    </div>
  );
}

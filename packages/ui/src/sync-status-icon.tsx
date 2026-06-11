import type { ReactElement } from 'react';

export function SyncStatusIcon({ status }: { status: string }): ReactElement {
  const normalizedStatus = status.toLowerCase();
  const className = normalizedStatus.includes('failed')
    ? 'bg-[#d65a53]'
    : normalizedStatus.includes('saving') || normalizedStatus.includes('loading')
      ? 'animate-pulse bg-[#a6a69f]'
      : 'bg-[#8e9b82]';

  return (
    <span
      aria-label={status}
      className="flex items-center gap-2 text-[#8d8d86] text-xs"
      role="status"
    >
      <span className={`size-2 rounded-full ${className}`} aria-hidden="true" />
    </span>
  );
}

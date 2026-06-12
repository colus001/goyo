import type { ReactElement } from 'react';

export function WindowDragRegion(): ReactElement {
  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-30 h-8 [-webkit-app-region:drag]" />
  );
}

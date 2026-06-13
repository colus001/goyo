import { Download } from 'lucide-react';
import type { ReactElement, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

type ExportFormat = 'html' | 'markdown' | 'text';

export function WritingExportMenu({
  canExportDocument,
  onExportChapter,
  onExportDocument,
}: {
  canExportDocument: boolean;
  onExportChapter?: (format: ExportFormat) => void;
  onExportDocument?: (format: ExportFormat) => void;
}): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDisabled = (!canExportDocument || !onExportDocument) && !onExportChapter;

  useCloseExportMenu(isOpen, containerRef, () => setIsOpen(false));

  return (
    <div className="relative [-webkit-app-region:no-drag]" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Export document"
        className="grid size-8 place-items-center rounded-lg text-[var(--goyo-text-muted)] outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)] disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--goyo-text-muted)]"
        disabled={isDisabled}
        onClick={() => setIsOpen((current) => !current)}
        title="Export document"
        type="button"
      >
        <Download aria-hidden="true" size={16} strokeWidth={2.1} />
      </button>
      {isOpen && (onExportDocument || onExportChapter) ? (
        <ExportMenu
          onClose={() => setIsOpen(false)}
          onExportChapter={onExportChapter}
          onExportDocument={onExportDocument}
        />
      ) : null}
    </div>
  );
}

function ExportMenu({
  onClose,
  onExportChapter,
  onExportDocument,
}: {
  onClose: () => void;
  onExportChapter?: (format: ExportFormat) => void;
  onExportDocument?: (format: ExportFormat) => void;
}): ReactElement {
  return (
    <div
      className="absolute top-9 right-0 z-30 min-w-44 rounded-lg border border-[#deded8] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      role="menu"
    >
      {onExportDocument ? (
        <>
          <ExportMenuItem label="Document as plain text" onClick={() => onExport('text')} />
          <ExportMenuItem label="Document as Markdown" onClick={() => onExport('markdown')} />
          <ExportMenuItem label="Document as HTML" onClick={() => onExport('html')} />
        </>
      ) : null}
      {onExportChapter ? (
        <>
          {onExportDocument ? <hr className="my-1 border-[#ededed]" /> : null}
          <ExportMenuItem
            label="Chapter as plain text"
            onClick={() => onExportChapterNow('text')}
          />
          <ExportMenuItem
            label="Chapter as Markdown"
            onClick={() => onExportChapterNow('markdown')}
          />
          <ExportMenuItem label="Chapter as HTML" onClick={() => onExportChapterNow('html')} />
        </>
      ) : null}
    </div>
  );

  function onExport(format: ExportFormat) {
    onExportDocument?.(format);
    onClose();
  }

  function onExportChapterNow(format: ExportFormat) {
    onExportChapter?.(format);
    onClose();
  }
}

function ExportMenuItem({ label, onClick }: { label: string; onClick: () => void }): ReactElement {
  return (
    <button
      className="block w-full px-3 py-2 text-left text-[#2f2e2a] text-sm outline-none hover:bg-[#f4f1ea]"
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      {label}
    </button>
  );
}

function useCloseExportMenu(
  isOpen: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', closeOnOutsidePointer);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [containerRef, isOpen, onClose]);
}

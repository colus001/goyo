import { APP_NAME } from '@writer/shared'
import type { ReactElement, ReactNode } from 'react'

export interface WritingShellPreviewProps {
  activeDocumentId?: string
  children?: ReactNode
  documents?: Array<{
    id: string
    title: string
    updatedAt: string
  }>
  onCreateDocument?: () => void
  onSelectDocument?: (documentId: string) => void
  status?: string
}

export function WritingShellPreview({
  activeDocumentId,
  children,
  documents = [],
  onCreateDocument,
  onSelectDocument,
  status = 'Local session',
}: WritingShellPreviewProps): ReactElement {
  return (
    <main className="grid min-h-screen grid-cols-[20rem_minmax(0,1fr)] overflow-hidden bg-[#f7f7f5] font-sans text-[#252525]">
      <aside
        className="flex min-h-screen flex-col border-[#deded9] border-r bg-[#fbfbfa]"
        aria-label="Documents"
      >
        <header className="flex h-16 items-center gap-3 border-[#ededeb] border-b px-5">
          <h1 className="min-w-0 flex-1 truncate font-semibold text-[1.35rem] tracking-[-0.03em]">
            {APP_NAME}
          </h1>
          <button
            aria-label="New document"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-[#30302d] font-medium text-[#fbfbfa] text-xl leading-none transition hover:bg-[#111110] focus:outline-none focus:ring-2 focus:ring-[#d65a53]/35"
            onClick={onCreateDocument}
            type="button"
          >
            +
          </button>
        </header>

        <nav className="min-h-0 flex-1 overflow-y-auto px-4 pb-4" aria-label="Local documents">
          <p className="px-2 pt-4 pb-2 font-semibold text-[#989891] text-[0.7rem] uppercase tracking-[0.13em]">
            Manuscript
          </p>
          <div className="space-y-1">
            {documents.map((document) => {
              const isActive = document.id === activeDocumentId

              return (
                <button
                  className={`group relative w-full cursor-pointer rounded-xl px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#d65a53]/30 ${
                    isActive ? 'bg-[#f0f0ed]' : 'hover:bg-[#f4f4f1]'
                  }`}
                  key={document.id}
                  onClick={() => onSelectDocument?.(document.id)}
                  type="button"
                >
                  {isActive ? (
                    <span className="absolute top-3 bottom-3 left-0 w-1 rounded-full bg-[#d65a53]" />
                  ) : null}
                  <p className="truncate font-semibold text-[#292927] text-[0.95rem] tracking-[-0.01em]">
                    {document.title || 'Untitled draft'}
                  </p>
                  <p className="mt-1 text-[#a0a09a] text-xs">
                    {formatDocumentDate(document.updatedAt)}
                  </p>
                </button>
              )
            })}
          </div>
        </nav>

        <footer className="border-[#ededeb] border-t px-5 py-3">
          <p className="font-medium text-[#868680] text-xs uppercase tracking-[0.12em]">{status}</p>
        </footer>
      </aside>

      <section className="min-h-screen overflow-y-auto bg-[#f7f7f5]" aria-label="Writing surface">
        {children ?? (
          <article className="mx-auto min-h-screen w-full max-w-[68rem] bg-[#ffffff] px-24 py-20">
            <p className="mb-4 font-medium text-[#999991] text-xs uppercase tracking-[0.13em]">
              No draft selected
            </p>
            <h2 className="mt-0 mb-6 font-semibold text-[2.75rem] tracking-[-0.045em]">
              Untitled draft
            </h2>
            <p className="max-w-[42rem] text-[#4d4d49] text-xl leading-[1.75]">
              Choose a draft from the manuscript list or create a new section to begin writing.
            </p>
          </article>
        )}
      </section>
    </main>
  )
}

function formatDocumentDate(updatedAt: string): string {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(updatedAt))
}

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
}

export function WritingShellPreview({
  activeDocumentId,
  children,
  documents = [],
  onCreateDocument,
  onSelectDocument,
}: WritingShellPreviewProps): ReactElement {
  return (
    <main className="grid min-h-screen grid-cols-[18rem_minmax(0,1fr)] bg-[#f4efe6] font-sans text-[#2d2923]">
      <aside className="border-[#d8cbb9] border-r bg-[#e7ddcf] p-8" aria-label="Documents">
        <p className="font-medium text-[#7a6d5f] text-xs uppercase tracking-[0.08em]">
          Local draft space
        </p>
        <h1 className="mt-0 mb-8 font-serif text-4xl font-medium leading-none">{APP_NAME}</h1>
        <button
          className="cursor-pointer rounded-full bg-[#2d2923] px-4 py-3 font-inherit text-[#fffaf0]"
          onClick={onCreateDocument}
          type="button"
        >
          New document
        </button>
        <nav className="mt-8 space-y-2" aria-label="Local documents">
          {documents.map((document) => {
            const isActive = document.id === activeDocumentId

            return (
              <button
                className={`w-full cursor-pointer rounded-2xl border px-4 py-3 text-left ${
                  isActive ? 'border-[#c5b49f] bg-[#fffaf0]' : 'border-transparent bg-[#ded2c1]'
                }`}
                key={document.id}
                onClick={() => onSelectDocument?.(document.id)}
                type="button"
              >
                <p className="truncate font-serif text-[#2d2923] text-lg">{document.title}</p>
                <p className="mt-1 text-[#7a6d5f] text-xs">
                  {formatDocumentDate(document.updatedAt)}
                </p>
              </button>
            )
          })}
        </nav>
      </aside>

      <section className="flex flex-col px-16 py-8" aria-label="Writing surface preview">
        <p className="font-medium text-[#7a6d5f] text-xs uppercase tracking-[0.08em]">
          Local session
        </p>
        {children ?? (
          <article className="mt-16 min-h-[32rem] w-full max-w-[44rem] self-center bg-[#fffaf0] p-16 shadow-[0_24px_80px_rgb(45_41_35_/_12%)]">
            <h2 className="mt-0 mb-6 font-serif text-[2.75rem] font-medium">Untitled draft</h2>
            <p className="text-lg leading-[1.8]">
              A quiet desktop writing surface will live here. The next milestone adds the Tiptap
              editor backed by Yjs and local persistence.
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

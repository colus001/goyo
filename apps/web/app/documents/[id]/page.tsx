'use client';

import { WritingEditor, type WritingEditorRef } from '@writer/editor';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCloudDocumentSync } from '@/lib/use-cloud-document-sync';

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur">
      {children}
    </div>
  );
}

export default function DocumentDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const documentId = decodeURIComponent(id);
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const editorRef = useRef<WritingEditorRef>(null);
  const [wordCount, setWordCount] = useState(0);
  const cloudDocument = useCloudDocumentSync({
    documentId,
    editorRef,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
  }, [isLoading, user, router]);

  if (isLoading || !cloudDocument.isReady) {
    return (
      <div>
        <header className="mb-10 max-w-4xl">
          <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
            Document
          </p>
        </header>
        <Panel>
          <p className="text-[#b8b9ac] text-sm">Loading document…</p>
        </Panel>
      </div>
    );
  }

  if (cloudDocument.error) {
    return (
      <div>
        <header className="mb-10 max-w-4xl">
          <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
            Document
          </p>
        </header>
        <Panel>
          <p className="text-[#c98b7a] text-sm">{cloudDocument.error}</p>
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-10 max-w-4xl">
        <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">Document</p>
        <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-[#f3f0df] sm:text-6xl lg:text-7xl">
          {cloudDocument.document?.title || 'Untitled'}
        </h1>
        <p className="mt-5 max-w-2xl text-[#b8b9ac] text-sm leading-relaxed">
          Cloud editor preview. Desktop remains the safest local-first editor; this page syncs body
          edits through Goyo Cloud so same-document merge behavior can be tested from another
          client.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          className="rounded-full border border-[#f3f0df]/20 px-4 py-2 text-[#b8b9ac] text-sm transition hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
          href="/documents"
        >
          ← Back to documents
        </Link>
        <button
          className="rounded-full border border-[#f3f0df]/20 px-4 py-2 text-[#b8b9ac] text-sm transition hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
          onClick={() => void cloudDocument.pullRemoteUpdates()}
          type="button"
        >
          Pull remote edits
        </button>
        <span className="text-[#9fa99b] text-xs">{wordCount} words</span>
      </div>

      <Panel>
        <div className="mb-4 rounded-full border border-[#f3f0df]/10 bg-[#151816]/60 px-4 py-2 text-[#b8b9ac] text-xs">
          {cloudDocument.syncStatus}
        </div>
        <div className="min-h-[34rem] rounded-[1.5rem] bg-[#f3f0df] px-8 py-10 text-[#20251f] shadow-inner sm:px-12">
          <WritingEditor
            documentId={documentId}
            initialSnapshot={cloudDocument.initialSnapshot}
            initialUpdates={cloudDocument.initialUpdates}
            onDocumentUpdate={cloudDocument.onDocumentUpdate}
            onWordCountChange={setWordCount}
            ref={editorRef}
          />
        </div>
      </Panel>
    </div>
  );
}

'use client';

import { yjsUpdatesToExportContent } from '@writer/editor';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { base64ToUint8Array, fetchDocumentContent, fetchDocuments } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CloudDocument } from '@/lib/types';

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur">
      {children}
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: document detail loading is self-contained
export default function DocumentDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const documentId = decodeURIComponent(id);
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const [document, setDocument] = useState<CloudDocument | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadDocument = useCallback(async () => {
    try {
      const [docsResult, contentResult] = await Promise.all([
        fetchDocuments(),
        fetchDocumentContent(documentId),
      ]);
      setLoaded(true);
      if (docsResult.ok && docsResult.documents) {
        const doc = docsResult.documents.find((d) => d.id === documentId) ?? null;
        setDocument(doc);
      }
      if (contentResult.ok && contentResult.snapshotBase64) {
        const snapshot = base64ToUint8Array(contentResult.snapshotBase64);
        const { html: docHtml } = yjsUpdatesToExportContent({
          documentId,
          snapshot,
          updates: [],
        });
        setHtml(docHtml);
      }
    } catch {
      setLoaded(true);
      setError('Could not load document.');
    }
  }, [documentId]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user && !loaded) {
      void loadDocument();
    }
  }, [isLoading, user, loaded, router, loadDocument]);

  if (isLoading || !loaded) {
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

  if (error) {
    return (
      <div>
        <header className="mb-10 max-w-4xl">
          <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
            Document
          </p>
        </header>
        <Panel>
          <p className="text-[#c98b7a] text-sm">{error}</p>
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-10 max-w-4xl">
        <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">Document</p>
        <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-[#f3f0df] sm:text-6xl lg:text-7xl">
          {document?.title || 'Untitled'}
        </h1>
      </header>

      <div className="mb-6">
        <Link
          className="rounded-full border border-[#f3f0df]/20 px-4 py-2 text-[#b8b9ac] text-sm transition hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
          href="/documents"
        >
          ← Back to documents
        </Link>
      </div>

      <Panel>
        {html ? (
          <div
            className="prose prose-invert prose-lg max-w-none font-serif leading-relaxed text-[#eef0e8]"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: snapshot content is from the user's own D1 data via authenticated API
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-[#b8b9ac] text-sm">No content available for this document.</p>
        )}
      </Panel>
    </div>
  );
}

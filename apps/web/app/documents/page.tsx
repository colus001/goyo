'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { fetchDocuments } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CloudDocument } from '@/lib/types';

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur">
      {children}
    </div>
  );
}

export default function DocumentsPage(): ReactElement {
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<CloudDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user && !loaded) {
      void fetchDocuments()
        .then((result) => {
          setLoaded(true);
          if (result.ok && result.documents) {
            setDocuments(result.documents);
          } else {
            setError(result.error ?? 'Could not load documents.');
          }
        })
        .catch(() => {
          setLoaded(true);
          setError('Could not load documents.');
        });
    }
  }, [isLoading, user, loaded, router]);

  if (isLoading || !loaded) {
    return (
      <div>
        <header className="mb-10 max-w-4xl">
          <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
            Documents
          </p>
        </header>
        <Panel>
          <p className="text-[#b8b9ac] text-sm">Loading documents…</p>
        </Panel>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <header className="mb-10 max-w-4xl">
          <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
            Documents
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
        <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
          Documents
        </p>
        <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-[#f3f0df] sm:text-6xl lg:text-7xl">
          Your writing
        </h1>
      </header>

      {documents.length === 0 ? (
        <Panel>
          <p className="text-[#b8b9ac] text-sm">
            No synced documents yet. Start writing in the Goyo desktop app and enable sync to see
            your work here.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Link
              className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 text-left shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur transition hover:border-[#d9be7f]/30 hover:bg-[#272d26]/72"
              href={`/documents/${encodeURIComponent(doc.id)}`}
              key={doc.id}
            >
              <p className="font-serif text-lg leading-snug tracking-[-0.03em] text-[#f3f0df]">
                {doc.title || 'Untitled'}
              </p>
              <p className="mt-2 text-[#9fa99b] text-xs">
                {doc.kind}
                {doc.updatedAt ? ` · ${new Date(doc.updatedAt).toLocaleDateString()}` : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

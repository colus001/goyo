import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { serverAuthMe, serverFetchDocuments } from '@/lib/server-api';

function Panel({ children }: { children: ReactNode }) {
  return <div className="goyo-cloud-panel p-6 sm:p-8">{children}</div>;
}

export default async function DocumentsPage(): Promise<ReactElement> {
  const auth = await serverAuthMe();

  if (!auth.ok || !auth.value?.user) {
    redirect('/login');
  }

  const documentsResult = await serverFetchDocuments();

  if (!documentsResult.ok) {
    return (
      <div className="goyo-reveal">
        <header className="mb-10 max-w-4xl">
          <p className="goyo-cloud-kicker">Documents</p>
        </header>
        <Panel>
          <p className="text-[var(--goyo-danger)] text-sm">
            {documentsResult.error ?? 'Could not load documents.'}
          </p>
        </Panel>
      </div>
    );
  }

  const documents = documentsResult.value?.documents ?? [];

  return (
    <div className="goyo-reveal">
      <header className="mb-10 max-w-4xl">
        <p className="goyo-cloud-kicker">Documents</p>
        <h1 className="goyo-cloud-headline mt-5 text-balance text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
          Your writing
        </h1>
        <p className="mt-5 max-w-2xl text-[1.02rem] leading-7 text-[var(--goyo-text-muted)]">
          A quiet web shelf for synced work from Goyo Desktop. Open a document when you need to
          inspect or continue a draft away from the desk.
        </p>
      </header>

      {documents.length === 0 ? (
        <Panel>
          <p className="text-[var(--goyo-text-muted)] text-sm leading-6">
            No synced documents yet. Start writing in the Goyo desktop app and enable sync to see
            your work here.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Link
              className="goyo-cloud-panel p-6 text-left transition hover:-translate-y-0.5 hover:border-[var(--goyo-border-strong)] hover:bg-[var(--goyo-paper)]"
              href={`/documents/${encodeURIComponent(doc.id)}`}
              key={doc.id}
            >
              <p className="goyo-prose font-semibold text-[1.35rem] leading-snug tracking-[-0.04em] text-[var(--goyo-text)]">
                {doc.title || 'Untitled'}
              </p>
              <p className="mt-3 text-[var(--goyo-text-faint)] text-xs">
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

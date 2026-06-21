import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import {
  serverAuthMe,
  serverFetchDocumentContent,
  serverFetchDocumentMetadata,
  serverFetchDocumentUpdates,
} from '@/lib/server-api';
import { CloudDocumentEditor } from './cloud-document-editor';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactElement> {
  const auth = await serverAuthMe();

  if (!auth.ok || !auth.value?.user) {
    redirect('/login');
  }

  const { id } = await params;
  const documentId = decodeURIComponent(id);
  const [metadataResult, contentResult] = await Promise.all([
    serverFetchDocumentMetadata(documentId),
    serverFetchDocumentContent(documentId),
  ]);

  if (!metadataResult.ok || !metadataResult.value?.document) {
    notFound();
  }

  if (!contentResult.ok) {
    return (
      <CloudDocumentError message={contentResult.error ?? 'Could not load document content.'} />
    );
  }

  const content = contentResult.value ?? {};
  const updatesResult = await serverFetchDocumentUpdates(
    documentId,
    content.snapshotLastUpdateId ?? null,
  );

  if (!updatesResult.ok) {
    return (
      <CloudDocumentError message={updatesResult.error ?? 'Could not load document updates.'} />
    );
  }

  const updates = updatesResult.value?.updates ?? [];

  return (
    <CloudDocumentEditor
      document={metadataResult.value.document}
      documentId={documentId}
      initialSnapshotBase64={content.snapshotBase64}
      initialUpdateBase64Values={updates.map((update) => update.updateBase64)}
      key={documentId}
      latestUpdateId={updates.at(-1)?.id ?? content.snapshotLastUpdateId ?? null}
    />
  );
}

function CloudDocumentError({ message }: { message: string }): ReactElement {
  return (
    <article className="mx-auto flex min-h-full w-full max-w-[52rem] items-center justify-center bg-[var(--goyo-paper)] px-12 py-16">
      <p className="text-[var(--goyo-text-muted)] text-sm">{message}</p>
    </article>
  );
}

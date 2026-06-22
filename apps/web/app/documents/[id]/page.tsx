import { notFound, redirect } from 'next/navigation';
import { serverAuthMe, serverFetchDocumentMetadata } from '@/lib/server-api';

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await serverAuthMe();

  if (!auth.ok || !auth.value?.user) {
    redirect('/login');
  }

  const { id } = await params;
  const documentId = decodeURIComponent(id);
  const metadataResult = await serverFetchDocumentMetadata(documentId);

  if (!metadataResult.ok || !metadataResult.value?.document) {
    notFound();
  }

  redirect(
    `/books/${encodeURIComponent(metadataResult.value.document.bookId)}/documents/${encodeURIComponent(documentId)}`,
  );
}

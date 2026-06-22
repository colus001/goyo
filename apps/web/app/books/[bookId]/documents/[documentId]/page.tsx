import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { CloudDocumentEditor } from '@/components/cloud-document-editor';
import {
  serverAuthMe,
  serverFetchBooks,
  serverFetchChapters,
  serverFetchDocumentContent,
  serverFetchDocumentMetadata,
  serverFetchDocumentUpdates,
} from '@/lib/server-api';
import type { CloudBook, CloudChapter, CloudDocument } from '@/lib/types';

export default async function BookDocumentDetailPage({
  params,
}: {
  params: Promise<{ bookId: string; documentId: string }>;
}): Promise<ReactElement> {
  const auth = await serverAuthMe();

  if (!auth.ok || !auth.value?.user) {
    redirect('/login');
  }

  const { bookId: encodedBookId, documentId: encodedDocumentId } = await params;
  const bookId = decodeURIComponent(encodedBookId);
  const documentId = decodeURIComponent(encodedDocumentId);
  const [metadataResult, contentResult, booksResult, chaptersResult] = await Promise.all([
    serverFetchDocumentMetadata(documentId),
    serverFetchDocumentContent(documentId),
    serverFetchBooks(),
    serverFetchChapters(),
  ]);

  if (!metadataResult.ok || !metadataResult.value?.document) {
    notFound();
  }

  const document = metadataResult.value.document;

  if (document.bookId !== bookId) {
    redirect(
      `/books/${encodeURIComponent(document.bookId)}/documents/${encodeURIComponent(document.id)}`,
    );
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

  return renderCloudDocumentEditor({
    books: booksResult.value?.books ?? [],
    chapters: chaptersResult.value?.chapters ?? [],
    content,
    document,
    documentId,
    updates,
  });
}

function renderCloudDocumentEditor({
  books,
  chapters,
  content,
  document,
  documentId,
  updates,
}: {
  books: CloudBook[];
  chapters: CloudChapter[];
  content: { snapshotBase64?: string; snapshotLastUpdateId?: string | null };
  document: CloudDocument;
  documentId: string;
  updates: Array<{ id: string; updateBase64: string }>;
}): ReactElement {
  const contextLabel = createDocumentContextLabel(document, books, chapters);

  return (
    <CloudDocumentEditor
      contextLabel={contextLabel}
      document={document}
      documentId={documentId}
      initialSnapshotBase64={content.snapshotBase64}
      initialUpdateBase64Values={updates.map((update) => update.updateBase64)}
      latestUpdateId={updates.at(-1)?.id ?? content.snapshotLastUpdateId ?? null}
    />
  );
}

function createDocumentContextLabel(
  document: CloudDocument,
  books: CloudBook[],
  chapters: CloudChapter[],
): string {
  return createContextLabel({
    bookTitle: books.find((book) => book.id === document.bookId)?.title,
    chapterTitle: document.chapterId
      ? chapters.find((chapter) => chapter.id === document.chapterId)?.title
      : null,
  });
}

function createContextLabel({
  bookTitle,
  chapterTitle,
}: {
  bookTitle?: string;
  chapterTitle?: string | null;
}): string {
  return `${bookTitle || 'Untitled book'} / ${chapterTitle || 'Book-level episode'}`;
}

function CloudDocumentError({ message }: { message: string }): ReactElement {
  return (
    <article className="mx-auto flex min-h-full w-full max-w-[52rem] items-center justify-center bg-[var(--goyo-paper)] px-12 py-16">
      <p className="text-[var(--goyo-text-muted)] text-sm">{message}</p>
    </article>
  );
}

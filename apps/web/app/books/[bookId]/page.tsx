import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import {
  serverAuthMe,
  serverFetchBooks,
  serverFetchChapters,
  serverFetchDocuments,
} from '@/lib/server-api';
import type { CloudBook, CloudChapter, CloudDocument } from '@/lib/types';

interface ChapterGroup {
  chapter: CloudChapter | null;
  documents: CloudDocument[];
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="goyo-cloud-panel p-6 sm:p-8">{children}</div>;
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}): Promise<ReactElement> {
  const auth = await serverAuthMe();

  if (!auth.ok || !auth.value?.user) {
    redirect('/login');
  }

  const { bookId: encodedBookId } = await params;
  const bookId = decodeURIComponent(encodedBookId);
  const [booksResult, chaptersResult, documentsResult] = await Promise.all([
    serverFetchBooks(),
    serverFetchChapters(),
    serverFetchDocuments(),
  ]);

  if (!booksResult.ok || !chaptersResult.ok || !documentsResult.ok) {
    return (
      <div className="goyo-reveal">
        <BookDetailHeader book={null} />
        <Panel>
          <p className="text-[var(--goyo-danger)] text-sm">
            {booksResult.error ??
              chaptersResult.error ??
              documentsResult.error ??
              'Could not load book.'}
          </p>
        </Panel>
      </div>
    );
  }

  const documents = documentsResult.value?.documents ?? [];
  const book = findBook({
    bookId,
    books: booksResult.value?.books ?? [],
    documents,
  });

  if (!book) {
    notFound();
  }

  const chapterGroups = createChapterGroups({
    bookId,
    chapters: chaptersResult.value?.chapters ?? [],
    documents,
  });

  return (
    <div className="goyo-reveal">
      <BookDetailHeader book={book} />
      {chapterGroups.length === 0 ? (
        <Panel>
          <p className="text-[var(--goyo-text-muted)] text-sm leading-6">
            No synced episodes in this book yet.
          </p>
        </Panel>
      ) : (
        <div className="space-y-6">
          {chapterGroups.map((group) => (
            <ChapterSection bookId={book.id} group={group} key={group.chapter?.id ?? 'book'} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookDetailHeader({ book }: { book: CloudBook | null }): ReactElement {
  return (
    <header className="mb-10 max-w-4xl">
      <Link
        className="text-[var(--goyo-text-faint)] text-xs transition hover:text-[var(--goyo-text-muted)]"
        href="/books"
      >
        Books
      </Link>
      <p className="goyo-cloud-kicker mt-5">Book</p>
      <h1 className="goyo-cloud-headline mt-5 text-balance text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
        {book?.title || 'Untitled book'}
      </h1>
      <p className="mt-5 max-w-2xl text-[1.02rem] leading-7 text-[var(--goyo-text-muted)]">
        Browse synced book-level episodes, chapters, and drafts from Goyo Desktop.
      </p>
    </header>
  );
}

function ChapterSection({ bookId, group }: { bookId: string; group: ChapterGroup }): ReactElement {
  return (
    <section className="goyo-cloud-panel p-5 sm:p-7">
      <h2 className="mb-4 font-medium text-[var(--goyo-text-muted)] text-sm">
        {group.chapter?.title ?? 'Book-level episodes'}
      </h2>
      {group.documents.length === 0 ? (
        <p className="rounded-2xl border border-[var(--goyo-border)] px-4 py-3 text-[var(--goyo-text-faint)] text-sm">
          No synced episodes in this chapter yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {group.documents.map((doc) => (
            <DocumentCard bookId={bookId} doc={doc} key={doc.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function DocumentCard({ bookId, doc }: { bookId: string; doc: CloudDocument }): ReactElement {
  return (
    <Link
      className="rounded-[1.35rem] border border-[var(--goyo-border)] bg-[var(--goyo-raised)]/45 p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--goyo-border-strong)] hover:bg-[var(--goyo-paper)]"
      href={`/books/${encodeURIComponent(bookId)}/documents/${encodeURIComponent(doc.id)}`}
    >
      <p className="goyo-prose font-semibold text-[1.2rem] leading-snug tracking-[-0.04em] text-[var(--goyo-text)]">
        {doc.title || 'Untitled'}
      </p>
      <p className="mt-3 text-[var(--goyo-text-faint)] text-xs">
        {doc.kind}
        {doc.updatedAt ? ` · ${new Date(doc.updatedAt).toLocaleDateString()}` : ''}
      </p>
    </Link>
  );
}

function findBook({
  bookId,
  books,
  documents,
}: {
  bookId: string;
  books: CloudBook[];
  documents: CloudDocument[];
}): CloudBook | null {
  return (
    books.find((book) => book.id === bookId) ??
    createFallbackBookFromDocuments(bookId, documents) ??
    null
  );
}

function createFallbackBookFromDocuments(
  bookId: string,
  documents: CloudDocument[],
): CloudBook | null {
  const document = documents.find((candidate) => candidate.bookId === bookId);

  if (!document) return null;

  return {
    accentColor: '#a6534b',
    archivedAt: null,
    createdAt: document.updatedAt,
    id: bookId,
    title: 'Untitled book',
    updatedAt: document.updatedAt,
  };
}

function createChapterGroups({
  bookId,
  chapters,
  documents,
}: {
  bookId: string;
  chapters: CloudChapter[];
  documents: CloudDocument[];
}): ChapterGroup[] {
  const bookChapters = chapters
    .filter((chapter) => chapter.bookId === bookId)
    .sort(compareChapters);
  const bookDocuments = documents.filter((document) => document.bookId === bookId);
  const groups: ChapterGroup[] = [];
  const bookLevelDocuments = bookDocuments
    .filter((document) => document.chapterId === null)
    .sort(compareDocuments);

  if (bookLevelDocuments.length > 0) {
    groups.push({ chapter: null, documents: bookLevelDocuments });
  }

  for (const chapter of bookChapters) {
    groups.push({
      chapter,
      documents: bookDocuments
        .filter((document) => document.chapterId === chapter.id)
        .sort(compareDocuments),
    });
  }

  return groups;
}

function compareChapters(left: CloudChapter, right: CloudChapter): number {
  return left.order - right.order || left.createdAt.localeCompare(right.createdAt);
}

function compareDocuments(left: CloudDocument, right: CloudDocument): number {
  return left.order - right.order || left.createdAt.localeCompare(right.createdAt);
}

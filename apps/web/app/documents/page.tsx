import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import {
  serverAuthMe,
  serverFetchBooks,
  serverFetchChapters,
  serverFetchDocuments,
} from '@/lib/server-api';
import type { CloudBook, CloudChapter, CloudDocument } from '@/lib/types';

interface BookSection {
  book: CloudBook;
  chapterGroups: ChapterGroup[];
}

interface ChapterGroup {
  chapter: CloudChapter | null;
  documents: CloudDocument[];
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="goyo-cloud-panel p-6 sm:p-8">{children}</div>;
}

export default async function DocumentsPage(): Promise<ReactElement> {
  const auth = await serverAuthMe();

  if (!auth.ok || !auth.value?.user) {
    redirect('/login');
  }

  const [booksResult, chaptersResult, documentsResult] = await Promise.all([
    serverFetchBooks(),
    serverFetchChapters(),
    serverFetchDocuments(),
  ]);

  if (!booksResult.ok || !chaptersResult.ok || !documentsResult.ok) {
    return (
      <div className="goyo-reveal">
        <header className="mb-10 max-w-4xl">
          <p className="goyo-cloud-kicker">Documents</p>
        </header>
        <Panel>
          <p className="text-[var(--goyo-danger)] text-sm">
            {booksResult.error ??
              chaptersResult.error ??
              documentsResult.error ??
              'Could not load writing.'}
          </p>
        </Panel>
      </div>
    );
  }

  const books = booksResult.value?.books ?? [];
  const chapters = chaptersResult.value?.chapters ?? [];
  const documents = documentsResult.value?.documents ?? [];
  const bookSections = createBookSections({ books, chapters, documents });

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

      {bookSections.length === 0 ? (
        <Panel>
          <p className="text-[var(--goyo-text-muted)] text-sm leading-6">
            No synced documents yet. Start writing in the Goyo desktop app and enable sync to see
            your books and chapters here.
          </p>
        </Panel>
      ) : (
        <div className="space-y-8">
          {bookSections.map((section) => (
            <section className="goyo-cloud-panel p-5 sm:p-7" key={section.book.id}>
              <header className="mb-5 flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1 size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: section.book.accentColor }}
                />
                <div className="min-w-0">
                  <h2 className="goyo-prose truncate font-semibold text-2xl tracking-[-0.045em] text-[var(--goyo-text)]">
                    {section.book.title || 'Untitled book'}
                  </h2>
                  <p className="mt-1 text-[var(--goyo-text-faint)] text-xs">
                    {formatBookSummary(section)}
                  </p>
                </div>
              </header>

              <div className="space-y-6">
                {section.chapterGroups.map((group) => (
                  <section key={group.chapter?.id ?? `${section.book.id}:book-level`}>
                    <h3 className="mb-3 font-medium text-[var(--goyo-text-muted)] text-sm">
                      {group.chapter?.title ?? 'Book-level episodes'}
                    </h3>
                    {group.documents.length === 0 ? (
                      <p className="rounded-2xl border border-[var(--goyo-border)] px-4 py-3 text-[var(--goyo-text-faint)] text-sm">
                        No synced documents in this chapter yet.
                      </p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {group.documents.map((doc) => (
                          <DocumentCard doc={doc} key={doc.id} />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentCard({ doc }: { doc: CloudDocument }): ReactElement {
  return (
    <Link
      className="rounded-[1.35rem] border border-[var(--goyo-border)] bg-[var(--goyo-raised)]/45 p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--goyo-border-strong)] hover:bg-[var(--goyo-paper)]"
      href={`/documents/${encodeURIComponent(doc.id)}`}
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

function createBookSections({
  books,
  chapters,
  documents,
}: {
  books: CloudBook[];
  chapters: CloudChapter[];
  documents: CloudDocument[];
}): BookSection[] {
  const booksById = new Map(books.map((book) => [book.id, book]));

  for (const document of documents) {
    if (!booksById.has(document.bookId)) {
      booksById.set(document.bookId, createFallbackBook(document.bookId, document.updatedAt));
    }
  }

  return Array.from(booksById.values()).map((book) => {
    const bookChapters = chapters
      .filter((chapter) => chapter.bookId === book.id)
      .sort(compareChapters);
    const bookDocuments = documents.filter((document) => document.bookId === book.id);
    const groups: ChapterGroup[] = [];
    const bookLevelDocuments = bookDocuments
      .filter((document) => document.chapterId === null)
      .sort(compareDocuments);

    if (bookLevelDocuments.length > 0 || bookChapters.length === 0) {
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

    return { book, chapterGroups: groups };
  });
}

function createFallbackBook(bookId: string, updatedAt: string): CloudBook {
  return {
    accentColor: '#a6534b',
    archivedAt: null,
    createdAt: updatedAt,
    id: bookId,
    title: 'Untitled book',
    updatedAt,
  };
}

function compareChapters(left: CloudChapter, right: CloudChapter): number {
  return left.order - right.order || left.createdAt.localeCompare(right.createdAt);
}

function compareDocuments(left: CloudDocument, right: CloudDocument): number {
  return left.order - right.order || left.createdAt.localeCompare(right.createdAt);
}

function formatBookSummary(section: BookSection): string {
  const chapterCount = section.chapterGroups.filter((group) => group.chapter).length;
  const documentCount = section.chapterGroups.reduce(
    (total, group) => total + group.documents.length,
    0,
  );

  return `${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'} · ${documentCount} ${
    documentCount === 1 ? 'document' : 'documents'
  }`;
}

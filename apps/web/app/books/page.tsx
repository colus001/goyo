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

interface BookListItem {
  book: CloudBook;
  chapterCount: number;
  episodeCount: number;
  updatedAt: string;
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="goyo-cloud-panel p-6 sm:p-8">{children}</div>;
}

export default async function BooksPage(): Promise<ReactElement> {
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
          <p className="goyo-cloud-kicker">Books</p>
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
  const bookItems = createBookListItems({ books, chapters, documents });

  return (
    <div className="goyo-reveal">
      <header className="mb-10 max-w-4xl">
        <p className="goyo-cloud-kicker">Books</p>
        <h1 className="goyo-cloud-headline mt-5 text-balance text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
          Your books
        </h1>
        <p className="mt-5 max-w-2xl text-[1.02rem] leading-7 text-[var(--goyo-text-muted)]">
          A quiet web shelf for synced books from Goyo Desktop. Choose a book to browse its
          chapters, book-level episodes, and drafts.
        </p>
      </header>

      {bookItems.length === 0 ? (
        <Panel>
          <p className="text-[var(--goyo-text-muted)] text-sm leading-6">
            No synced books yet. Start writing in the Goyo desktop app and enable sync to see your
            books and chapters here.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bookItems.map((item) => (
            <BookCard item={item} key={item.book.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookCard({ item }: { item: BookListItem }): ReactElement {
  return (
    <Link
      className="goyo-cloud-panel flex min-h-52 flex-col justify-between p-6 text-left transition hover:-translate-y-0.5 hover:border-[var(--goyo-border-strong)] hover:bg-[var(--goyo-paper)]"
      href={`/books/${encodeURIComponent(item.book.id)}`}
    >
      <span
        aria-hidden="true"
        className="mb-8 size-3 rounded-full"
        style={{ backgroundColor: item.book.accentColor }}
      />
      <span>
        <span className="goyo-prose block font-semibold text-2xl leading-tight tracking-[-0.045em] text-[var(--goyo-text)]">
          {item.book.title || 'Untitled book'}
        </span>
        <span className="mt-3 block text-[var(--goyo-text-muted)] text-sm">
          {formatBookSummary(item)}
        </span>
        <span className="mt-2 block text-[var(--goyo-text-faint)] text-xs">
          Updated {new Date(item.updatedAt).toLocaleDateString()}
        </span>
      </span>
    </Link>
  );
}

function createBookListItems({
  books,
  chapters,
  documents,
}: {
  books: CloudBook[];
  chapters: CloudChapter[];
  documents: CloudDocument[];
}): BookListItem[] {
  const booksById = new Map(books.map((book) => [book.id, book]));

  for (const document of documents) {
    if (!booksById.has(document.bookId)) {
      booksById.set(document.bookId, createFallbackBook(document.bookId, document.updatedAt));
    }
  }

  return Array.from(booksById.values())
    .map((book) => createBookListItem(book, chapters, documents))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function createBookListItem(
  book: CloudBook,
  chapters: CloudChapter[],
  documents: CloudDocument[],
): BookListItem {
  const bookDocuments = documents.filter((document) => document.bookId === book.id);
  const latestDocumentUpdate = bookDocuments.reduce(
    (latest, document) => (document.updatedAt > latest ? document.updatedAt : latest),
    book.updatedAt,
  );

  return {
    book,
    chapterCount: chapters.filter((chapter) => chapter.bookId === book.id).length,
    episodeCount: bookDocuments.length,
    updatedAt: latestDocumentUpdate,
  };
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

function formatBookSummary(item: BookListItem): string {
  return `${item.chapterCount} ${item.chapterCount === 1 ? 'chapter' : 'chapters'} · ${
    item.episodeCount
  } ${item.episodeCount === 1 ? 'episode' : 'episodes'}`;
}

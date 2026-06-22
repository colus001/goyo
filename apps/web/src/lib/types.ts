export interface CloudUser {
  email: string;
  id: string;
}

export interface CloudBook {
  accentColor: string;
  archivedAt: string | null;
  createdAt: string;
  id: string;
  title: string;
  updatedAt: string;
}

export interface CloudChapter {
  archivedAt: string | null;
  bookId: string;
  createdAt: string;
  id: string;
  order: number;
  title: string;
  updatedAt: string;
}

export interface CloudDocument {
  archivedAt: string | null;
  bookId: string;
  chapterId: string | null;
  createdAt: string;
  id: string;
  kind: string;
  order: number;
  title: string;
  updatedAt: string;
}

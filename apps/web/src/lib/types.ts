export interface CloudUser {
  email: string;
  id: string;
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

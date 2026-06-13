import type { DocumentMetadata } from '@writer/core';
import { type WritingEditorRef, yjsUpdatesToExportContent } from '@writer/editor';
import type { WritingWorkspaceState } from './document-workspace-types';

type ExportFormat = 'html' | 'markdown' | 'text';

export async function exportActiveChapter(workspace: WritingWorkspaceState, format: ExportFormat) {
  const chapter = workspace.activeChapter;

  if (!chapter) {
    return;
  }

  const documents = (workspace.session?.documents ?? [])
    .filter((document) => document.chapterId === chapter.id && document.archivedAt === null)
    .sort(
      (first, second) =>
        first.order - second.order || first.createdAt.localeCompare(second.createdAt),
    );
  const exportedDocuments = await Promise.all(
    documents.map(async (document) => ({
      content: await loadDocumentExportContent(document.id),
      document,
    })),
  );

  void window.writerDesktop.documentExport.save({
    content: buildChapterExportContent(chapter.title, exportedDocuments, format),
    format,
    title: chapter.title || 'Untitled chapter',
  });
}

export function exportActiveDocument(
  document: DocumentMetadata,
  editor: WritingEditorRef | null,
  format: ExportFormat,
) {
  if (!editor) {
    return;
  }

  void window.writerDesktop.documentExport.save({
    content: getExportContent(editor, format),
    format,
    title: document.title || `Untitled ${document.kind}`,
  });
}

async function loadDocumentExportContent(documentId: string) {
  const snapshot = await window.writerDesktop.documentSnapshots.getLatest(documentId);
  const updates = snapshot?.lastUpdateId
    ? await window.writerDesktop.documentUpdates.listAfter(documentId, snapshot.lastUpdateId)
    : await window.writerDesktop.documentUpdates.list(documentId);

  return yjsUpdatesToExportContent({
    documentId,
    snapshot: snapshot?.snapshot,
    updates: updates.map((update) => update.update),
  });
}

function buildChapterExportContent(
  chapterTitle: string,
  documents: Array<{
    content: Awaited<ReturnType<typeof loadDocumentExportContent>>;
    document: DocumentMetadata;
  }>,
  format: ExportFormat,
) {
  if (format === 'html') {
    return [
      `<h1>${escapeHtml(chapterTitle || 'Untitled chapter')}</h1>`,
      ...documents.map(
        ({ content, document }) =>
          `<section>\n<h2>${escapeHtml(document.title || `Untitled ${document.kind}`)}</h2>\n${content.html}\n</section>`,
      ),
    ].join('\n');
  }

  if (format === 'markdown') {
    return [
      `# ${chapterTitle || 'Untitled chapter'}`,
      ...documents.map(
        ({ content, document }) =>
          `## ${document.title || `Untitled ${document.kind}`}\n\n${content.markdown}`,
      ),
    ].join('\n\n');
  }

  return [
    chapterTitle || 'Untitled chapter',
    ...documents.map(
      ({ content, document }) =>
        `${document.title || `Untitled ${document.kind}`}\n\n${content.plainText}`,
    ),
  ].join('\n\n');
}

function getExportContent(editor: WritingEditorRef, format: ExportFormat): string {
  if (format === 'html') {
    return editor.getHtml();
  }

  if (format === 'markdown') {
    return editor.getMarkdown();
  }

  return editor.getPlainText();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

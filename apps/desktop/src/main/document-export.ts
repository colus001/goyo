import { writeFile } from 'node:fs/promises';
import { dialog } from 'electron';

type DocumentExportFormat = 'html' | 'markdown' | 'text';

interface DocumentExportInput {
  content: string;
  format: DocumentExportFormat;
  title: string;
}

interface DocumentExportResult {
  exported: boolean;
  filePath: string | null;
}

export async function exportDocument(input: DocumentExportInput): Promise<DocumentExportResult> {
  const result = await dialog.showSaveDialog({
    defaultPath: `${sanitizeFileName(input.title || 'Untitled document')}.${getExtension(input.format)}`,
    filters: [getDialogFilter(input.format)],
    title: `Export ${input.title || 'document'}`,
  });

  if (result.canceled || !result.filePath) {
    return { exported: false, filePath: null };
  }

  await writeFile(result.filePath, normalizeExportContent(input));

  return { exported: true, filePath: result.filePath };
}

function normalizeExportContent(input: DocumentExportInput): string {
  if (input.format !== 'html') {
    return input.content;
  }

  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${escapeHtml(input.title || 'Untitled document')}</title>\n</head>\n<body>\n${input.content}\n</body>\n</html>\n`;
}

function getExtension(format: DocumentExportFormat): string {
  if (format === 'html') {
    return 'html';
  }

  if (format === 'markdown') {
    return 'md';
  }

  return 'txt';
}

function getDialogFilter(format: DocumentExportFormat): Electron.FileFilter {
  if (format === 'html') {
    return { extensions: ['html'], name: 'HTML document' };
  }

  if (format === 'markdown') {
    return { extensions: ['md'], name: 'Markdown document' };
  }

  return { extensions: ['txt'], name: 'Plain text document' };
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Untitled document';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

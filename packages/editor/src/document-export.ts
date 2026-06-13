import * as Y from 'yjs';

interface TiptapJsonNode {
  attrs?: Record<string, unknown>;
  content?: TiptapJsonNode[];
  marks?: Array<{ attrs?: Record<string, unknown>; type: string }>;
  text?: string;
  type?: string;
}

export interface StoredDocumentExportContent {
  html: string;
  markdown: string;
  plainText: string;
}

export function tiptapJsonToMarkdown(document: unknown): string {
  return renderBlockChildren(asNode(document).content ?? []).trim();
}

export function yjsUpdatesToExportContent({
  documentId,
  snapshot,
  updates,
}: {
  documentId: string;
  snapshot?: Uint8Array;
  updates: Uint8Array[];
}): StoredDocumentExportContent {
  const document = new Y.Doc();

  if (snapshot) {
    Y.applyUpdate(document, snapshot);
  }

  for (const update of updates) {
    Y.applyUpdate(document, update);
  }

  const html = document.getXmlFragment(documentId).toString();

  return {
    html,
    markdown: htmlToMarkdown(html),
    plainText: htmlToPlainText(html),
  };
}

export function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

export function htmlToMarkdown(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gis, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gis, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gis, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gis, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gis, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gis, '###### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gis, '_$1_')
      .replace(/<i[^>]*>(.*?)<\/i>/gis, '_$1_')
      .replace(/<code[^>]*>(.*?)<\/code>/gis, '`$1`')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n')
      .replace(
        /<blockquote[^>]*>(.*?)<\/blockquote>/gis,
        (_match, content: string) => `${prefixLines(htmlToMarkdown(content), '> ')}\n\n`,
      )
      .replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '  \n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function renderBlockChildren(nodes: TiptapJsonNode[]): string {
  return nodes
    .map((node, index) => renderBlock(node, { index }))
    .filter((value) => value.trim().length > 0)
    .join('\n\n');
}

function renderBlock(node: TiptapJsonNode, context: { index: number }): string {
  switch (node.type) {
    case 'blockquote':
      return prefixLines(renderBlockChildren(node.content ?? []), '> ');
    case 'bulletList':
      return renderList(node, '-');
    case 'codeBlock':
      return `\`\`\`\n${renderInlineChildren(node.content ?? [])}\n\`\`\``;
    case 'hardBreak':
      return '\n';
    case 'heading':
      return `${'#'.repeat(getHeadingLevel(node))} ${renderInlineChildren(node.content ?? [])}`;
    case 'listItem':
      return renderListItem(node, '-');
    case 'orderedList':
      return renderOrderedList(node);
    case 'paragraph':
      return renderInlineChildren(node.content ?? []);
    default:
      if (node.text) {
        return renderText(node);
      }

      return renderBlockChildren(node.content ?? []).trim() || String(context.index + 1);
  }
}

function renderList(node: TiptapJsonNode, marker: string): string {
  return (node.content ?? [])
    .map((child) => renderListItem(child, marker))
    .filter(Boolean)
    .join('\n');
}

function renderOrderedList(node: TiptapJsonNode): string {
  const start = typeof node.attrs?.start === 'number' ? node.attrs.start : 1;

  return (node.content ?? [])
    .map((child, index) => renderListItem(child, `${start + index}.`))
    .filter(Boolean)
    .join('\n');
}

function renderListItem(node: TiptapJsonNode, marker: string): string {
  const content = (node.content ?? [])
    .map((child) => {
      if (child.type === 'paragraph') {
        return renderInlineChildren(child.content ?? []);
      }

      return renderBlock(child, { index: 0 });
    })
    .filter(Boolean)
    .join('\n  ');

  return `${marker} ${content}`.trimEnd();
}

function renderInlineChildren(nodes: TiptapJsonNode[]): string {
  return nodes.map(renderInline).join('');
}

function renderInline(node: TiptapJsonNode): string {
  if (node.type === 'hardBreak') {
    return '  \n';
  }

  if (node.text) {
    return renderText(node);
  }

  return renderInlineChildren(node.content ?? []);
}

function renderText(node: TiptapJsonNode): string {
  let value = node.text ?? '';

  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') {
      value = `**${value}**`;
    } else if (mark.type === 'italic') {
      value = `_${value}_`;
    } else if (mark.type === 'code') {
      value = `\`${value}\``;
    }
  }

  return value;
}

function getHeadingLevel(node: TiptapJsonNode): number {
  const level = node.attrs?.level;

  if (typeof level !== 'number' || level < 1 || level > 6) {
    return 1;
  }

  return level;
}

function prefixLines(value: string, prefix: string): string {
  return value
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function asNode(value: unknown): TiptapJsonNode {
  return typeof value === 'object' && value !== null ? (value as TiptapJsonNode) : {};
}

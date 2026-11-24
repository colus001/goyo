import * as Y from 'yjs';

type FragmentNode = Y.XmlElement | Y.XmlText;

export function readParagraphText(fragment: Y.XmlFragment): string {
  return fragment.toArray().map(readNodeText).join('\n');
}

export function writeParagraphText(fragment: Y.XmlFragment, text: string): void {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks = fragment.toArray();
  const blockLines = blocks.map((block) => readNodeText(block).split('\n'));
  let firstBlock = 0;
  let firstLine = 0;
  let lastBlock = blocks.length;
  let lastLine = lines.length;

  while (
    firstBlock < lastBlock &&
    matchesLines(lines, firstLine, lastLine, blockLines[firstBlock])
  ) {
    firstLine += blockLines[firstBlock].length;
    firstBlock += 1;
  }
  while (lastBlock > firstBlock) {
    const block = blockLines[lastBlock - 1];
    const start = lastLine - block.length;
    if (start < firstLine || !matchesLines(lines, start, lastLine, block)) break;
    lastBlock -= 1;
    lastLine = start;
  }

  fragment.doc?.transact(() => {
    const replacement = lines.slice(firstLine, lastLine);
    const count = lastBlock - firstBlock;
    if (
      count === 1 &&
      replacement.length === 1 &&
      blockLines[firstBlock].length === 1 &&
      editParagraph(blocks[firstBlock], replacement[0])
    ) {
      return;
    }

    if (count) fragment.delete(firstBlock, count);
    if (replacement.length) fragment.insert(firstBlock, replacement.map(createParagraph));
  });
}

function matchesLines(lines: string[], start: number, end: number, block: string[]): boolean {
  return start + block.length <= end && block.every((line, index) => line === lines[start + index]);
}

function readNodeText(node: FragmentNode | Y.XmlHook): string {
  if (node instanceof Y.XmlText) {
    return node
      .toDelta()
      .map(({ insert }: { insert: unknown }) => (typeof insert === 'string' ? insert : ''))
      .join('');
  }
  if (!(node instanceof Y.XmlElement)) return '';
  const name = node.nodeName.toLowerCase();
  if (name === 'hardbreak' || name === 'br') return '\n';
  const separator = ['blockquote', 'bulletlist', 'orderedlist', 'listitem'].includes(name)
    ? '\n'
    : '';
  return node.toArray().map(readNodeText).join(separator);
}

function createParagraph(value: string): Y.XmlElement {
  const paragraph = new Y.XmlElement('paragraph');
  if (value) paragraph.insert(0, [new Y.XmlText(value)]);
  return paragraph;
}

function editParagraph(node: FragmentNode | Y.XmlHook, value: string): boolean {
  if (!(node instanceof Y.XmlElement) || node.nodeName !== 'paragraph' || node.length > 1) {
    return false;
  }
  if (!node.length) {
    if (value) node.insert(0, [new Y.XmlText(value)]);
    return true;
  }
  const text = node.get(0);
  if (!(text instanceof Y.XmlText)) return false;
  const previous = readNodeText(text);
  if (text.length !== previous.length) return false;
  patchText(text, previous, value);
  return true;
}

function patchText(text: Y.XmlText, previous: string, value: string): void {
  let prefix = 0;
  while (prefix < previous.length && prefix < value.length) {
    const point = previous.codePointAt(prefix);
    if (point !== value.codePointAt(prefix)) break;
    prefix += point !== undefined && point > 0xffff ? 2 : 1;
  }
  let oldEnd = previous.length;
  let newEnd = value.length;
  while (oldEnd > prefix && newEnd > prefix && previous[oldEnd - 1] === value[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  if (splitsSurrogatePair(previous, oldEnd) || splitsSurrogatePair(value, newEnd)) {
    oldEnd += 1;
    newEnd += 1;
  }
  if (oldEnd > prefix) text.delete(prefix, oldEnd - prefix);
  if (newEnd > prefix) text.insert(prefix, value.slice(prefix, newEnd));
}

function splitsSurrogatePair(text: string, offset: number): boolean {
  return offset > 0 && (text.codePointAt(offset - 1) ?? 0) > 0xffff;
}

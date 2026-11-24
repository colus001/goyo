import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { readParagraphText, writeParagraphText } from './mobile-paragraphs';

function createFragment() {
  return new Y.Doc().getXmlFragment('episode');
}

describe('mobile paragraph encoding', () => {
  it('encodes each Enter as a paragraph boundary and preserves intentional blank lines', () => {
    const fragment = createFragment();
    const text = ' 첫 문단  \n두 번째 문단\n\n네 번째 문단\n';
    writeParagraphText(fragment, text);

    expect(fragment.toArray().map((node) => (node as Y.XmlElement).nodeName)).toEqual(
      Array(5).fill('paragraph'),
    );
    expect(readParagraphText(fragment)).toBe(text);
  });

  it('reads desktop paragraph boundaries without trimming whitespace', () => {
    const fragment = createFragment();
    fragment.insert(0, [paragraph('  <&>'), paragraph(''), paragraph('다음  ')]);
    expect(readParagraphText(fragment)).toBe('  <&>\n\n다음  ');
  });

  it('converts a legacy paragraph when edited without rewriting unrelated blocks', () => {
    const fragment = createFragment();
    const legacy = paragraph('첫 문단\n둘째 문단');
    const heading = new Y.XmlElement('heading');
    heading.setAttribute('level', '2');
    heading.insert(0, [new Y.XmlText('제목')]);
    fragment.insert(0, [heading, legacy]);
    expect(readParagraphText(fragment)).toBe('제목\n첫 문단\n둘째 문단');

    writeParagraphText(fragment, '제목\n첫 문단\n둘째 문단!');

    expect(fragment.get(0)).toBe(heading);
    expect(
      fragment
        .toArray()
        .slice(1)
        .map((node) => node.toString()),
    ).toEqual(['<paragraph>첫 문단</paragraph>', '<paragraph>둘째 문단!</paragraph>']);
  });

  it('keeps the same Yjs paragraph and text when editing within a line', () => {
    const fragment = createFragment();
    const block = paragraph('문장');
    fragment.insert(0, [block]);
    const text = block.get(0);
    writeParagraphText(fragment, '문장 끝');
    expect(fragment.get(0)).toBe(block);
    expect(block.get(0)).toBe(text);
    expect(readParagraphText(fragment)).toBe('문장 끝');
  });

  it('replaces emoji without splitting UTF-16 surrogate pairs', () => {
    const fragment = createFragment();
    fragment.insert(0, [paragraph('시작 😀 끝')]);
    writeParagraphText(fragment, '시작 😁 끝');
    expect(readParagraphText(fragment)).toBe('시작 😁 끝');
  });
});

function paragraph(value: string) {
  const block = new Y.XmlElement('paragraph');
  if (value) block.insert(0, [new Y.XmlText(value)]);
  return block;
}

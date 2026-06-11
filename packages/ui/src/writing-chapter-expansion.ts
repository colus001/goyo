import { useEffect, useState } from 'react';
import type { WritingShellProps } from './writing-shell';

type ChapterItem = NonNullable<WritingShellProps['chapters']>[number];
type DocumentItem = NonNullable<WritingShellProps['documents']>[number];

export interface ChapterExpansionActions {
  collapseAll: () => void;
  openAll: (chapters: ChapterItem[]) => void;
  toggle: (chapterId: string) => void;
}

export function useExpandedChapters(
  activeDocumentId: string | undefined,
  documents: DocumentItem[],
): [Set<string>, ChapterExpansionActions] {
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const chapterId = documents.find((document) => document.id === activeDocumentId)?.chapterId;

    if (chapterId) {
      setExpandedChapterIds((current) => new Set(current).add(chapterId));
    }
  }, [activeDocumentId, documents]);

  return [
    expandedChapterIds,
    {
      collapseAll: () => setExpandedChapterIds(new Set()),
      openAll: (chapters) => setExpandedChapterIds(new Set(chapters.map((chapter) => chapter.id))),
      toggle: (chapterId) => setExpandedChapterIds((current) => toggleSetValue(current, chapterId)),
    },
  ];
}

function toggleSetValue(values: Set<string>, value: string): Set<string> {
  const nextValues = new Set(values);

  if (nextValues.has(value)) {
    nextValues.delete(value);
  } else {
    nextValues.add(value);
  }

  return nextValues;
}

import { useCallback, useEffect, useRef, useState } from 'react';
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
  controlledExpandedChapterIds?: string[],
  onExpandedChapterIdsChange?: (chapterIds: string[]) => void,
): [Set<string>, ChapterExpansionActions] {
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(() => new Set());
  const currentExpandedChapterIds = controlledExpandedChapterIds
    ? new Set(controlledExpandedChapterIds)
    : expandedChapterIds;
  const previousActiveDocumentIdRef = useRef(activeDocumentId);

  const setNextExpandedChapterIds = useCallback(
    (nextValues: Set<string>) => {
      if (controlledExpandedChapterIds === undefined) {
        setExpandedChapterIds(nextValues);
      }

      onExpandedChapterIdsChange?.([...nextValues]);
    },
    [controlledExpandedChapterIds, onExpandedChapterIdsChange],
  );

  useEffect(() => {
    if (previousActiveDocumentIdRef.current === activeDocumentId) {
      return;
    }

    previousActiveDocumentIdRef.current = activeDocumentId;

    const chapterId = documents.find((document) => document.id === activeDocumentId)?.chapterId;

    if (chapterId && !currentExpandedChapterIds.has(chapterId)) {
      setNextExpandedChapterIds(new Set(currentExpandedChapterIds).add(chapterId));
    }
  }, [activeDocumentId, documents, currentExpandedChapterIds, setNextExpandedChapterIds]);

  return [
    currentExpandedChapterIds,
    {
      collapseAll: () => setNextExpandedChapterIds(new Set()),
      openAll: (chapters) =>
        setNextExpandedChapterIds(new Set(chapters.map((chapter) => chapter.id))),
      toggle: (chapterId) =>
        setNextExpandedChapterIds(toggleSetValue(currentExpandedChapterIds, chapterId)),
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

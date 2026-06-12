import { Search } from 'lucide-react';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { ChapterTree } from './writing-chapter-tree';
import type { WritingShellProps } from './writing-shell';

interface WritingSidebarProps extends Omit<WritingShellProps, 'children'> {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function WritingSidebar({
  activeChapterId,
  activeDocumentId,
  chapters = [],
  documents = [],
  isCollapsed,
  onCreateChapter,
  onCreateEpisodeAfter,
  onDeleteChapter,
  onDeleteDocument,
  onMoveChapter,
  onMoveDocument,
  onRenameChapter,
  onSelectDocument,
  onExpandedChapterIdsChange,
  expandedChapterIds,
}: WritingSidebarProps): ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredNavigation = useMemo(
    () => filterNavigationItems(chapters, documents, searchQuery),
    [chapters, documents, searchQuery],
  );

  return (
    <aside
      className={`flex h-full min-h-0 flex-col overflow-hidden border-[#deded9] border-r bg-[#fbfbfa] ${
        isCollapsed ? 'pointer-events-none border-r-0' : ''
      }`}
      aria-label="Manuscript navigation"
      aria-hidden={isCollapsed}
    >
      {!isCollapsed ? (
        <>
          <header className="border-[#e4e0d8] border-b bg-[#fbfaf7] px-3 py-3">
            <label className="flex h-9 items-center gap-2 rounded-lg border border-[#e1ddd5] bg-white/70 px-2.5 text-[#9b958b] text-xs uppercase tracking-[0.14em]">
              <Search aria-hidden="true" size={15} strokeWidth={2.1} />
              <input
                className="min-w-0 flex-1 bg-transparent text-[#5f5b53] outline-none placeholder:text-[#a9a39a]"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search"
                type="search"
                value={searchQuery}
              />
            </label>
          </header>
          <ChapterTree
            activeChapterId={activeChapterId}
            activeDocumentId={activeDocumentId}
            chapters={filteredNavigation.chapters}
            documents={filteredNavigation.documents}
            expandedChapterIds={expandedChapterIds}
            onCreateChapter={onCreateChapter}
            onCreateEpisodeAfter={onCreateEpisodeAfter}
            onDeleteChapter={onDeleteChapter}
            onDeleteDocument={onDeleteDocument}
            onMoveChapter={onMoveChapter}
            onMoveDocument={onMoveDocument}
            onRenameChapter={onRenameChapter}
            onExpandedChapterIdsChange={onExpandedChapterIdsChange}
            onSelectDocument={onSelectDocument}
          />
        </>
      ) : null}
    </aside>
  );
}

function filterNavigationItems(
  chapters: NonNullable<WritingShellProps['chapters']>,
  documents: NonNullable<WritingShellProps['documents']>,
  searchQuery: string,
): {
  chapters: NonNullable<WritingShellProps['chapters']>;
  documents: NonNullable<WritingShellProps['documents']>;
} {
  const query = searchQuery.trim().toLowerCase();

  if (query.length === 0) {
    return { chapters, documents };
  }

  const matchingDocuments = documents.filter((document) =>
    document.title.toLowerCase().includes(query),
  );
  const matchingDocumentChapterIds = new Set(
    matchingDocuments.map((document) => document.chapterId).filter(Boolean),
  );
  const matchingChapters = chapters.filter(
    (chapter) =>
      chapter.title.toLowerCase().includes(query) || matchingDocumentChapterIds.has(chapter.id),
  );
  const matchingChapterIds = new Set(matchingChapters.map((chapter) => chapter.id));

  return {
    chapters: matchingChapters,
    documents: documents.filter(
      (document) =>
        document.title.toLowerCase().includes(query) ||
        (document.chapterId !== null && matchingChapterIds.has(document.chapterId)),
    ),
  };
}

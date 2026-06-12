import type { ReactElement } from 'react';
import type { WritingSidebarContextMenuState } from './writing-chapter-row';
import { DocumentRow } from './writing-document-row';
import type { WritingShellProps } from './writing-shell';

type DocumentItem = NonNullable<WritingShellProps['documents']>[number];

export function BookEpisodeList(props: BookEpisodeListProps): ReactElement | null {
  if (props.documents.length === 0) {
    return null;
  }

  return (
    <section className="py-1.5" data-sidebar-item>
      <p className="px-3 pb-1 font-semibold text-[#a09a91] text-[0.68rem] uppercase tracking-[0.13em]">
        Unfiled
      </p>
      <div className="pl-1">
        {props.documents.map((document, index) => (
          <DocumentRow
            document={document}
            isActive={document.id === props.activeDocumentId}
            key={document.id}
            menuPosition={getDocumentMenuPosition(document.id, props.openContextMenu)}
            onCloseMenu={props.onCloseMenu}
            onInsertAfter={
              index === props.documents.length - 1
                ? () => props.onCreateEpisodeAfter?.(null, document.id)
                : undefined
            }
            onInsertBefore={() =>
              props.onCreateEpisodeAfter?.(null, index === 0 ? null : props.documents[index - 1].id)
            }
            onDeleteDocument={props.onDeleteDocument}
            onMoveDocument={props.onMoveDocument}
            onOpenMenu={(position) => props.onOpenMenu(document.id, position)}
            onSelectDocument={props.onSelectDocument}
          />
        ))}
      </div>
    </section>
  );
}

interface BookEpisodeListProps {
  activeDocumentId?: string;
  documents: DocumentItem[];
  onCloseMenu: () => void;
  onCreateEpisodeAfter?: (chapterId: string | null, previousDocumentId: string | null) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onOpenMenu: (documentId: string, position: { x: number; y: number }) => void;
  onSelectDocument?: (documentId: string) => void;
  openContextMenu: WritingSidebarContextMenuState;
}

function getDocumentMenuPosition(
  documentId: string,
  openContextMenu: WritingSidebarContextMenuState,
) {
  if (openContextMenu?.kind !== 'document' || openContextMenu.documentId !== documentId) {
    return null;
  }

  return { x: openContextMenu.x, y: openContextMenu.y };
}

import { BookOpen, ChevronsDown, ChevronsUp, Plus } from 'lucide-react';
import type { ReactElement } from 'react';
import { ContextMenu } from './context-menu';

export function SidebarEmptySpaceContextMenu({
  onClose,
  onCollapseAll,
  onNewChapter,
  onNewEpisode,
  onOpenAll,
  x,
  y,
}: {
  onClose: () => void;
  onCollapseAll: () => void;
  onNewChapter: () => void;
  onNewEpisode: () => void;
  onOpenAll: () => void;
  x: number;
  y: number;
}): ReactElement {
  return (
    <ContextMenu
      groups={[
        [
          {
            icon: <Plus aria-hidden="true" size={15} />,
            label: 'New document',
            onSelect: onNewEpisode,
          },
          {
            icon: <BookOpen aria-hidden="true" size={15} />,
            label: 'New chapter',
            onSelect: onNewChapter,
          },
        ],
        [
          {
            icon: <ChevronsDown aria-hidden="true" size={15} />,
            label: 'Expand all',
            onSelect: onOpenAll,
          },
          {
            icon: <ChevronsUp aria-hidden="true" size={15} />,
            label: 'Collapse all',
            onSelect: onCollapseAll,
          },
        ],
      ]}
      onClose={onClose}
      x={x}
      y={y}
    />
  );
}

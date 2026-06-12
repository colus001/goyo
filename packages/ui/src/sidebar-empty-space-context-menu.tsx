import { BookOpen, ChevronsDown, ChevronsUp, Plus } from 'lucide-react';
import type { ReactElement } from 'react';
import { ContextMenu, type ContextMenuGroup } from './context-menu';

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
  onCollapseAll?: () => void;
  onNewChapter?: () => void;
  onNewEpisode?: () => void;
  onOpenAll?: () => void;
  x: number;
  y: number;
}): ReactElement {
  const createGroup: ContextMenuGroup = [];
  const outlineGroup: ContextMenuGroup = [];

  if (onNewEpisode) {
    createGroup.push({
      icon: <Plus aria-hidden="true" size={15} />,
      label: 'New document',
      onSelect: onNewEpisode,
    });
  }

  if (onNewChapter) {
    createGroup.push({
      icon: <BookOpen aria-hidden="true" size={15} />,
      label: 'New chapter',
      onSelect: onNewChapter,
    });
  }

  if (onOpenAll) {
    outlineGroup.push({
      icon: <ChevronsDown aria-hidden="true" size={15} />,
      label: 'Expand all',
      onSelect: onOpenAll,
    });
  }

  if (onCollapseAll) {
    outlineGroup.push({
      icon: <ChevronsUp aria-hidden="true" size={15} />,
      label: 'Collapse all',
      onSelect: onCollapseAll,
    });
  }

  return <ContextMenu groups={[createGroup, outlineGroup]} onClose={onClose} x={x} y={y} />;
}

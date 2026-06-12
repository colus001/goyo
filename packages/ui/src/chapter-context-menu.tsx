import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { ContextMenu } from './context-menu';

export function ChapterContextMenu({
  onClose,
  onDelete,
  onNewEpisode,
  onRename,
  x,
  y,
}: {
  onClose: () => void;
  onDelete: () => void;
  onNewEpisode: () => void;
  onRename: () => void;
  x: number;
  y: number;
}): ReactElement {
  return (
    <ContextMenu
      groups={[
        [
          {
            icon: <Pencil aria-hidden="true" size={15} />,
            label: 'Rename',
            onSelect: onRename,
          },
          {
            icon: <Plus aria-hidden="true" size={15} />,
            label: 'New document',
            onSelect: onNewEpisode,
          },
        ],
        [
          {
            destructive: true,
            icon: <Trash2 aria-hidden="true" size={15} />,
            label: 'Delete',
            onSelect: onDelete,
          },
        ],
      ]}
      onClose={onClose}
      x={x}
      y={y}
    />
  );
}

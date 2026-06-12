import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

export function NewChapterModal({
  actionLabel = 'Create chapter',
  heading = 'New chapter',
  initialTitle = '',
  onClose,
  onCreate,
}: {
  actionLabel?: string;
  heading?: string;
  initialTitle?: string;
  onClose: () => void;
  onCreate: (title: string) => void;
}): ReactElement {
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#1f1d19]/20 px-6">
      <div
        aria-labelledby="new-chapter-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[#ded8ce] bg-[#fffefb] p-6 shadow-[0_24px_80px_rgba(31,29,25,0.24)]"
        role="dialog"
      >
        <p className="mb-3 font-medium text-[#8d887e] text-xs uppercase tracking-[0.16em]">
          {heading}
        </p>
        <input
          aria-label="Chapter title"
          className="block w-full rounded-md bg-transparent px-1 font-semibold text-[#25231f] text-[1.35rem] leading-tight tracking-[-0.045em] outline-none placeholder:text-[#b8b1a5]"
          id="new-chapter-title"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) {
              return;
            }

            if (event.key === 'Enter') {
              onCreate(title.trim().length > 0 ? title.trim() : 'Untitled chapter');
              onClose();
            }
          }}
          placeholder="Chapter title"
          ref={inputRef}
          value={title}
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-full bg-[#ece9e2] px-4 py-2 font-medium text-[#34312c] outline-none transition hover:bg-[#e3dfd6]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-[#30302d] px-4 py-2 font-medium text-white outline-none transition hover:bg-[#1f1f1d]"
            onClick={() => {
              onCreate(title.trim().length > 0 ? title.trim() : 'Untitled chapter');
              onClose();
            }}
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

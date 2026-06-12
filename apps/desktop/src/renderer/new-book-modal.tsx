import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

export function NewBookModal({
  accentColors,
  onCreate,
  onClose,
}: {
  accentColors: string[];
  onCreate: (title: string, accentColor: string) => void;
  onClose: () => void;
}): ReactElement {
  const [title, setTitle] = useState('');
  const [accentColor, setAccentColor] = useState(accentColors[0]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#1f1d19]/20 px-6">
      <NewBookModalDialog
        accentColor={accentColor}
        accentColors={accentColors}
        onChangeAccentColor={setAccentColor}
        onChangeTitle={setTitle}
        onClose={onClose}
        onCreate={onCreate}
        title={title}
      />
    </div>
  );
}

function NewBookModalDialog({
  accentColor,
  accentColors,
  onChangeAccentColor,
  onChangeTitle,
  onClose,
  onCreate,
  title,
}: {
  accentColor: string;
  accentColors: string[];
  onChangeAccentColor: (accentColor: string) => void;
  onChangeTitle: (title: string) => void;
  onClose: () => void;
  onCreate: (title: string, accentColor: string) => void;
  title: string;
}): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      aria-labelledby="new-book-title"
      aria-modal="true"
      className="w-full max-w-md rounded-2xl border border-[#ded8ce] bg-[#fffefb] p-6 shadow-[0_24px_80px_rgba(31,29,25,0.24)]"
      role="dialog"
    >
      <p className="mb-3 font-medium text-[#8d887e] text-xs uppercase tracking-[0.16em]">
        New book
      </p>
      <input
        aria-label="Book title"
        className="block w-full rounded-md bg-transparent px-1 font-semibold text-[#25231f] text-[1.35rem] leading-tight tracking-[-0.045em] outline-none placeholder:text-[#b8b1a5]"
        id="new-book-title"
        onChange={(event) => onChangeTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && title.trim().length > 0) {
            onCreate(title.trim(), accentColor);
            onClose();
          }
        }}
        placeholder="Book title"
        ref={inputRef}
        value={title}
      />
      <p className="mt-4 mb-2 font-medium text-[#8d887e] text-[0.68rem] uppercase tracking-[0.14em]">
        Cover color
      </p>
      <div className="flex gap-2">
        {accentColors.map((color) => (
          <button
            aria-label={`Set cover color ${color}`}
            className={`size-6 cursor-pointer rounded-full border-2 outline-none transition ${accentColor === color ? 'border-[#30302d] ring-2 ring-black/10' : 'border-transparent'}`}
            key={color}
            onClick={() => onChangeAccentColor(color)}
            style={{ backgroundColor: color }}
            type="button"
          />
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          className="cursor-pointer rounded-full bg-[#ece9e2] px-4 py-2 font-medium text-[#34312c] outline-none transition hover:bg-[#e3dfd6]"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="cursor-pointer rounded-full bg-[#30302d] px-4 py-2 font-medium text-white outline-none transition hover:bg-[#1f1f1d]"
          onClick={() => {
            onCreate(title.trim().length > 0 ? title.trim() : 'Untitled book', accentColor);
            onClose();
          }}
          type="button"
        >
          Create book
        </button>
      </div>
    </div>
  );
}

import { ChevronDown } from 'lucide-react';
import {
  type CSSProperties,
  type ReactElement,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type AppFontId,
  type AppLocale,
  getAppFontSample,
  getAppFontsForRole,
} from '../shared/app-fonts';

export interface SettingsDropdownOption<TValue extends string> {
  label: string;
  preview?: string;
  previewStyle?: CSSProperties;
  style?: CSSProperties;
  value: TValue;
}

export function SettingsDropdown<TValue extends string>({
  label,
  onSelect,
  options,
  selectedValue,
}: {
  label: string;
  onSelect: (value: TValue) => void;
  options: SettingsDropdownOption<TValue>[];
  selectedValue: TValue;
}): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

  useCloseDropdown({ isOpen, rootRef, setIsOpen });

  return (
    <div className="min-w-0" ref={rootRef}>
      <span className="mb-2 block font-medium text-[var(--goyo-text-muted)] text-sm">{label}</span>
      <div className="relative min-w-0">
        <SettingsDropdownTrigger
          isOpen={isOpen}
          onToggle={() => setIsOpen((current) => !current)}
          selectedOption={selectedOption}
        />
        {selectedOption.preview ? (
          <span
            className="mt-2 block truncate text-[var(--goyo-text-muted)] text-sm"
            style={selectedOption.previewStyle}
          >
            {selectedOption.preview}
          </span>
        ) : null}
        {isOpen ? (
          <SettingsDropdownMenu
            onSelect={(value) => {
              onSelect(value);
              setIsOpen(false);
            }}
            options={options}
            selectedValue={selectedValue}
          />
        ) : null}
      </div>
    </div>
  );
}

export function FontDropdown({
  fontRole,
  label,
  locale,
  onSelect,
  selectedFontId,
}: {
  fontRole: 'interface' | 'writing';
  label: string;
  locale: AppLocale;
  onSelect: (fontId: AppFontId) => void;
  selectedFontId: AppFontId;
}): ReactElement {
  const fonts = getAppFontsForRole(fontRole);
  const sample = getAppFontSample({ locale, role: fontRole });

  return (
    <SettingsDropdown
      label={label}
      onSelect={onSelect}
      options={fonts.map((font) => ({
        label: font.name,
        preview: sample,
        previewStyle: { fontFamily: font.cssFamily },
        style: { fontFamily: font.cssFamily },
        value: font.id,
      }))}
      selectedValue={selectedFontId}
    />
  );
}

function SettingsDropdownTrigger<TValue extends string>({
  isOpen,
  onToggle,
  selectedOption,
}: {
  isOpen: boolean;
  onToggle: () => void;
  selectedOption: SettingsDropdownOption<TValue>;
}): ReactElement {
  return (
    <button
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-[var(--goyo-raised)] py-2 pr-3 pl-3 text-left outline-none transition ${
        isOpen ? 'border-[var(--goyo-accent)]' : 'border-[var(--goyo-border)]'
      }`}
      onClick={onToggle}
      style={selectedOption.style}
      type="button"
    >
      <span className="min-w-0 truncate font-medium text-[var(--goyo-text)] text-sm">
        {selectedOption.label}
      </span>
      <ChevronDown
        aria-hidden="true"
        className={`size-4 shrink-0 text-[var(--goyo-text-muted)] transition ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
  );
}

function SettingsDropdownMenu<TValue extends string>({
  onSelect,
  options,
  selectedValue,
}: {
  onSelect: (value: TValue) => void;
  options: SettingsDropdownOption<TValue>[];
  selectedValue: TValue;
}): ReactElement {
  return (
    <div
      className="absolute right-0 left-0 z-20 mt-2 max-h-72 overflow-auto rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] p-1 shadow-xl shadow-black/10"
      role="listbox"
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;

        return (
          <button
            aria-selected={isSelected}
            className={`w-full rounded-lg px-3 py-2.5 text-left outline-none transition ${
              isSelected
                ? 'bg-[var(--goyo-accent-soft)] text-[var(--goyo-text)]'
                : 'text-[var(--goyo-text)] hover:bg-[var(--goyo-raised)]'
            }`}
            key={option.value}
            onClick={() => onSelect(option.value)}
            role="option"
            style={option.style}
            type="button"
          >
            <span className="block font-medium text-sm">{option.label}</span>
            {option.preview ? (
              <span
                className="mt-1 block truncate text-[var(--goyo-text-muted)] text-sm"
                style={option.previewStyle}
              >
                {option.preview}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function useCloseDropdown({
  isOpen,
  rootRef,
  setIsOpen,
}: {
  isOpen: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  setIsOpen: (isOpen: boolean) => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointerDown);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, rootRef, setIsOpen]);
}

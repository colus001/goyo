import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

type AppButtonVariant = 'danger' | 'ghost' | 'primary' | 'secondary';
type AppButtonSize = 'md' | 'sm';

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: AppButtonSize;
  variant?: AppButtonVariant;
}

const baseClassName =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium outline-none transition disabled:pointer-events-none disabled:opacity-45';

const variantClassNames: Record<AppButtonVariant, string> = {
  danger: 'bg-[var(--goyo-danger)] text-white hover:brightness-95',
  ghost:
    'border border-transparent text-[var(--goyo-text-muted)] hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]',
  primary: 'bg-[var(--goyo-accent)] text-white hover:bg-[var(--goyo-accent-hover)]',
  secondary:
    'border border-[var(--goyo-border)] bg-[var(--goyo-paper)] text-[var(--goyo-text)] hover:bg-[var(--goyo-accent-soft)]',
};

const sizeClassNames: Record<AppButtonSize, string> = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
};

export function AppButton({
  children,
  className,
  size = 'md',
  type = 'button',
  variant = 'secondary',
  ...props
}: AppButtonProps): ReactElement {
  return (
    <button
      className={[baseClassName, variantClassNames[variant], sizeClassNames[size], className]
        .filter(Boolean)
        .join(' ')}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

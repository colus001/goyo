import { BookOpen, Feather, PenLine, Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';
import logoMark from '../../../../assets/logo.png';

export function LibraryOnboarding({
  onOpenNewBookModal,
  onStartQuickDraft,
}: {
  onOpenNewBookModal: () => void;
  onStartQuickDraft: () => void;
}): ReactElement {
  return (
    <div className="relative grid h-full min-h-screen content-center overflow-hidden bg-[var(--goyo-paper)] px-6 py-8 sm:px-10">
      <div className="goyo-onboarding-drift absolute inset-0 opacity-55" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
        <img
          alt=""
          className="goyo-onboarding-logo goyo-onboarding-rise mx-auto mb-3 size-15 rounded-[1rem] shadow-[0_16px_42px_rgba(53,92,125,0.2)] sm:size-18 sm:rounded-[1.25rem]"
          src={logoMark}
        />
        <div className="goyo-onboarding-rise goyo-onboarding-delay-1 mb-5 sm:mb-6">
          <p className="font-semibold text-[3.35rem] text-[var(--goyo-text)] leading-[0.86] tracking-[-0.085em] sm:text-[4.7rem] lg:text-[5.25rem]">
            Goyo
          </p>
          <p className="mt-2.5 font-semibold text-[var(--goyo-text-muted)] text-[0.68rem] uppercase tracking-[0.24em] sm:text-xs">
            Quiet writing
          </p>
        </div>
        <h1 className="goyo-onboarding-rise goyo-onboarding-delay-2 mx-auto max-w-2xl text-balance font-medium text-[1.35rem] text-[var(--goyo-text)] leading-tight tracking-[-0.045em] sm:text-[1.75rem] lg:text-[2rem]">
          A quiet room for long writing.
        </h1>
        <p className="goyo-onboarding-rise goyo-onboarding-delay-3 mx-auto mt-2.5 max-w-xl text-[var(--goyo-text-muted)] text-sm leading-6 sm:text-[0.95rem] lg:text-base">
          Build books, collect loose drafts, and return to the page without setup getting in the
          way.
        </p>
        <div className="goyo-onboarding-rise goyo-onboarding-delay-4 mt-6 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--goyo-accent)] px-5 py-2.5 font-semibold text-white outline-none transition hover:-translate-y-0.5 hover:bg-[var(--goyo-accent-hover)] hover:shadow-[0_12px_28px_rgba(31,29,25,0.16)] sm:px-6"
            onClick={onOpenNewBookModal}
            type="button"
          >
            <BookOpen aria-hidden="true" size={17} />
            Create a book
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] px-5 py-2.5 font-semibold text-[var(--goyo-text)] outline-none transition hover:-translate-y-0.5 hover:bg-[var(--goyo-accent-soft)] sm:px-6"
            onClick={onStartQuickDraft}
            type="button"
          >
            <PenLine aria-hidden="true" size={17} />
            Start a quick draft
          </button>
        </div>
        <div className="goyo-onboarding-rise goyo-onboarding-delay-5 mx-auto mt-8 grid max-w-4xl gap-3 text-left sm:mt-9 sm:grid-cols-3 lg:mt-10">
          <OnboardingNote
            icon={<Feather aria-hidden="true" size={16} />}
            text="Draft essays, fiction, and notes without choosing a rigid structure first."
            title="Loose by default"
          />
          <OnboardingNote
            icon={<BookOpen aria-hidden="true" size={16} />}
            text="Use books when a project needs chapters, episodes, or a place to gather revision."
            title="Books when ready"
          />
          <OnboardingNote
            icon={<Sparkles aria-hidden="true" size={16} />}
            text="Local-first writing keeps the surface fast, calm, and out of your way."
            title="Quiet workspace"
          />
        </div>
      </div>
    </div>
  );
}

function OnboardingNote({
  icon,
  text,
  title,
}: {
  icon: ReactElement;
  text: string;
  title: string;
}): ReactElement {
  return (
    <div className="rounded-2xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)]/70 p-3.5 shadow-[0_10px_28px_rgba(31,29,25,0.05)] sm:p-4">
      <div className="mb-2.5 flex size-8 items-center justify-center rounded-full bg-[var(--goyo-accent-soft)] text-[var(--goyo-accent)] sm:mb-3">
        {icon}
      </div>
      <p className="font-semibold text-[var(--goyo-text)] text-sm">{title}</p>
      <p className="mt-1 text-[var(--goyo-text-muted)] text-sm leading-[1.7] sm:leading-6">
        {text}
      </p>
    </div>
  );
}

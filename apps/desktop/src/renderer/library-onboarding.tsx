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
    <div className="relative grid h-full min-h-screen place-items-center overflow-hidden bg-[var(--goyo-paper)] px-6 py-10 sm:px-10">
      <div className="goyo-onboarding-drift absolute inset-0 opacity-55" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
        <img
          alt=""
          className="goyo-onboarding-logo goyo-onboarding-rise mx-auto mb-4 size-18 rounded-[1.25rem] shadow-[0_18px_50px_rgba(53,92,125,0.22)]"
          src={logoMark}
        />
        <div className="goyo-onboarding-rise goyo-onboarding-delay-1 mb-6">
          <p className="font-semibold text-[3.5rem] text-[var(--goyo-text)] leading-[0.9] tracking-[-0.085em] sm:text-[5.25rem]">
            Goyo
          </p>
          <p className="mt-3 font-semibold text-[var(--goyo-text-muted)] text-xs uppercase tracking-[0.24em]">
            Quiet writing
          </p>
        </div>
        <h1 className="goyo-onboarding-rise goyo-onboarding-delay-2 mx-auto max-w-2xl text-balance font-medium text-[1.45rem] text-[var(--goyo-text)] leading-tight tracking-[-0.045em] sm:text-[2rem]">
          A quiet room for long writing.
        </h1>
        <p className="goyo-onboarding-rise goyo-onboarding-delay-3 mx-auto mt-3 max-w-xl text-[var(--goyo-text-muted)] text-sm leading-6 sm:text-base">
          Build books, collect loose drafts, and return to the page without setup getting in the
          way.
        </p>
        <div className="goyo-onboarding-rise goyo-onboarding-delay-4 mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--goyo-accent)] px-5 py-2.5 font-semibold text-white outline-none transition hover:-translate-y-0.5 hover:bg-[var(--goyo-accent-hover)] hover:shadow-[0_12px_28px_rgba(31,29,25,0.16)]"
            onClick={onOpenNewBookModal}
            type="button"
          >
            <BookOpen aria-hidden="true" size={17} />
            Create a book
          </button>
          <button
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] px-5 py-2.5 font-semibold text-[var(--goyo-text)] outline-none transition hover:-translate-y-0.5 hover:bg-[var(--goyo-accent-soft)]"
            onClick={onStartQuickDraft}
            type="button"
          >
            <PenLine aria-hidden="true" size={17} />
            Start a quick draft
          </button>
        </div>
        <div className="goyo-onboarding-rise goyo-onboarding-delay-5 mx-auto mt-10 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
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
    <div className="rounded-2xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)]/70 p-4 shadow-[0_10px_28px_rgba(31,29,25,0.05)]">
      <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-[var(--goyo-accent-soft)] text-[var(--goyo-accent)]">
        {icon}
      </div>
      <p className="font-semibold text-[var(--goyo-text)] text-sm">{title}</p>
      <p className="mt-1 text-[var(--goyo-text-muted)] text-sm leading-6">{text}</p>
    </div>
  );
}

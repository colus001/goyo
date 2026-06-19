import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { BackgroundDecoration } from '../lib/BackgroundDecoration';
import { RealWritingShellPreview } from './previews/RealWritingShellPreview';

const WALKTHROUGH_STEPS = [
  {
    id: 'surfaces',
    eyebrow: '01 / Start',
    title: 'Capture the line before it disappears.',
    body: 'Open a manuscript when you know where the idea belongs, or start writing immediately. Loose thoughts go into Quick Drafts, so the first sentence does not have to wait for a perfect project structure.',
  },
  {
    id: 'draft',
    eyebrow: '02 / Draft',
    title: 'Draft without fighting the interface.',
    body: 'Collapse the manuscript list when the page needs more room. Untitled pieces begin gently in the title field; titled pieces open into the body so your hands can stay with the sentence.',
  },
  {
    id: 'structure',
    eyebrow: '03 / Structure',
    title: 'Shape chapters when the shape is ready.',
    body: 'Books can hold chapters, episodes, notes, and chapterless fragments. Move pieces up or down without forcing every scene, aside, or essay note into the same mold.',
  },
  {
    id: 'sync',
    eyebrow: '04 / Sync',
    title: 'Sync without gambling with your words.',
    body: 'Drafts are preserved locally before cloud sync. Document content is designed around CRDT updates, so another device can merge changes instead of replacing the paragraph you just wrote.',
  },
];

const PREVIEW_STEP_COUNT = WALKTHROUGH_STEPS.length;

export function ProductPreviewScrollSection(): ReactElement {
  const theaterRef = useRef<HTMLDivElement>(null);
  const activeStepIndex = useActiveTheaterStep(theaterRef);

  return (
    <section
      className="goyo-product-walkthrough relative overflow-x-clip border-[var(--goyo-border)] border-b bg-[var(--goyo-paper)] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      id="how-it-works"
    >
      <BackgroundDecoration className="goyo-parallax-fast" variant="dot-grid" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="goyo-reveal font-medium text-[0.7rem] uppercase tracking-[0.22em] text-[var(--goyo-text-faint)]">
            Writer-first workflow
          </p>
          <h2 className="goyo-reveal goyo-reveal-lag-1 goyo-prose mt-3 text-[2.35rem] leading-tight tracking-[-0.055em] text-[var(--goyo-text)] sm:text-[3rem]">
            From first thought to a draft you can trust.
          </h2>
          <p className="goyo-reveal goyo-reveal-lag-2 mt-5 text-[1rem] leading-[1.75] text-[var(--goyo-text-muted)]">
            Goyo is built around the way long projects actually happen: fragments arrive early,
            structure comes later, and safe storage matters before polish does.
          </p>
        </div>

        <div className="goyo-product-theater mt-16" ref={theaterRef}>
          <div className="goyo-product-stage" data-step={activeStepIndex}>
            <div className="goyo-stage-grid">
              <div className="goyo-product-frame">
                <RealWritingShellPreview
                  className="h-[35rem] max-sm:h-[29rem]"
                  previewStep={activeStepIndex}
                />
              </div>

              <div className="goyo-copy-stack">
                {WALKTHROUGH_STEPS.map((step, index) => (
                  <article
                    aria-hidden={activeStepIndex !== index}
                    className={`goyo-copy-panel rounded-[28px] border border-[var(--goyo-border)] bg-[color-mix(in_srgb,var(--goyo-paper)_86%,transparent)] p-5 shadow-[0_22px_70px_-58px_rgba(31,29,25,0.52)] backdrop-blur-sm lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0 ${
                      activeStepIndex === index ? 'is-active' : ''
                    }`}
                    key={step.id}
                  >
                    <p className="font-medium text-[0.64rem] uppercase tracking-[0.22em] text-[var(--goyo-text-faint)]">
                      {step.eyebrow}
                    </p>
                    <h3 className="goyo-prose mt-3 text-[1.8rem] leading-[1.05] tracking-[-0.055em] text-[var(--goyo-text)] sm:text-[2.3rem]">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-[0.95rem] leading-[1.75] text-[var(--goyo-text-muted)]">
                      {step.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="goyo-scene-track">
            {WALKTHROUGH_STEPS.map((step, index) => (
              <span className="goyo-scene-marker" data-step={index} id={step.id} key={step.id} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function useActiveTheaterStep(theaterRef: React.RefObject<HTMLDivElement | null>): number {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateActiveStep = () => {
      frame = 0;
      const theater = theaterRef.current;

      if (!theater) {
        return;
      }

      const rect = theater.getBoundingClientRect();
      const scrollableDistance = Math.max(rect.height - window.innerHeight, 1);
      const progress = Math.min(
        Math.max((-rect.top + window.innerHeight * 0.32) / scrollableDistance, 0),
        0.999,
      );
      const nextStepIndex = Math.min(
        PREVIEW_STEP_COUNT - 1,
        Math.floor(progress * PREVIEW_STEP_COUNT),
      );

      setActiveStepIndex((current) => (current === nextStepIndex ? current : nextStepIndex));
    };

    const requestUpdate = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(updateActiveStep);
    };

    updateActiveStep();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [theaterRef]);

  return activeStepIndex;
}

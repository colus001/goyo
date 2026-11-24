import { expect, it } from 'vitest';
import { buildCoachPrompt } from './writing-coach-prompt';

it('sends the selected document and only earlier turns scoped to that document', () => {
  const prompt = buildCoachPrompt({
    context: 'A novel about leaving home',
    question: 'Does the ending work now?',
    manuscript: { id: 'departure', title: 'Departure', text: 'Current scene' },
    turns: [
      {
        id: 'past-turn',
        question: 'How does the opening read?',
        answer: 'It establishes a quiet tone.',
        attachments: [{ id: 'departure', title: 'Earlier draft' }],
      },
      {
        id: 'other-turn',
        question: 'What about the return?',
        answer: 'Feedback about the other scene.',
        attachments: [{ id: 'return', title: 'Return' }],
      },
      {
        id: 'old-comparison',
        question: 'How do these drafts compare?',
        answer: 'Feedback covering both drafts.',
        attachments: [
          { id: 'departure', title: 'Departure' },
          { id: 'return', title: 'Return' },
        ],
      },
    ],
  });
  expect(prompt).toContain('A novel about leaving home');
  expect(prompt).toContain('Current scene');
  expect(prompt).toContain('It establishes a quiet tone.');
  expect(prompt).not.toContain('Earlier draft');
  expect(prompt).not.toContain('Feedback about the other scene.');
  expect(prompt).not.toContain('Feedback covering both drafts.');
});

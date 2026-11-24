import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { CoachSession, CoachTurn } from '../shared/writing-coach';

interface CoachSessionRow {
  id: string;
  context: string;
  turns_json: string;
}

export function createWritingCoachStore(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS writing_coach_sessions (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      context TEXT NOT NULL DEFAULT '',
      turns_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS writing_coach_sessions_book
      ON writing_coach_sessions (book_id, updated_at DESC);
  `);
  const list = database.prepare<[string], CoachSessionRow>(
    'SELECT id, context, turns_json FROM writing_coach_sessions WHERE book_id = ? ORDER BY updated_at DESC, rowid DESC',
  );
  const get = database.prepare<[string, string], CoachSessionRow>(
    'SELECT id, context, turns_json FROM writing_coach_sessions WHERE book_id = ? AND id = ?',
  );
  const insert = database.prepare(
    'INSERT INTO writing_coach_sessions (id, book_id, updated_at) VALUES (?, ?, ?)',
  );
  const updateContext = database.prepare(
    'UPDATE writing_coach_sessions SET context = ? WHERE book_id = ? AND id = ?',
  );
  const updateTurns = database.prepare(
    'UPDATE writing_coach_sessions SET turns_json = ?, updated_at = ? WHERE book_id = ? AND id = ?',
  );

  return {
    list: (bookId: string) => list.all(bookId).map(toSession),
    get: (bookId: string, id: string) => {
      const row = get.get(bookId, id);
      return row ? toSession(row) : null;
    },
    create(bookId: string): CoachSession {
      const id = randomUUID();
      insert.run(id, bookId, new Date().toISOString());
      return { id, title: 'New conversation', context: '', turns: [] };
    },
    saveContext(bookId: string, id: string, context: string) {
      return updateContext.run(context, bookId, id).changes > 0;
    },
    appendTurn(bookId: string, id: string, turn: CoachTurn) {
      return database.transaction(() => {
        const row = get.get(bookId, id);
        if (!row) return false;
        const turns = toSession(row).turns;
        turns.push(turn);
        return (
          updateTurns.run(JSON.stringify(turns), new Date().toISOString(), bookId, id).changes > 0
        );
      })();
    },
  };
}

function toSession(row: CoachSessionRow): CoachSession {
  const turns = JSON.parse(row.turns_json) as CoachTurn[];
  return {
    id: row.id,
    context: row.context,
    title: turns[0]?.question.replaceAll(/\s+/g, ' ').slice(0, 48) || 'New conversation',
    turns,
  };
}

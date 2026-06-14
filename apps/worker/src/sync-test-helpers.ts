interface StoredDocument {
  archived_at: string | null;
  book_id: string;
  chapter_id: string | null;
  created_at: string;
  id: string;
  kind: 'draft' | 'episode' | 'note';
  owner_id: string;
  sort_order: number;
  title: string;
  updated_at: string;
}

interface StoredUpdate {
  client_id: string;
  created_at: string;
  document_id: string;
  id: string;
  owner_id: string;
  update_blob: ArrayBuffer;
}

interface StoredSyncClient {
  id: string;
  owner_id: string;
}

export function jsonRequest(body: unknown) {
  return new Request('https://sync.example.com', {
    body: JSON.stringify(body),
    method: 'POST',
  });
}

export function createTestEnv() {
  return { DB: new InMemoryD1Database() as unknown as D1Database };
}

class InMemoryD1Database {
  readonly documents = new Map<string, StoredDocument>();
  readonly syncClients = new Map<string, StoredSyncClient>();
  readonly updates = new Map<string, StoredUpdate>();

  prepare(sql: string) {
    return new InMemoryD1Statement(this, sql);
  }
}

class InMemoryD1Statement {
  private readonly parameters: unknown[];

  constructor(
    private readonly database: InMemoryD1Database,
    private readonly sql: string,
    parameters: unknown[] = [],
  ) {
    this.parameters = parameters;
  }

  bind(...parameters: unknown[]) {
    return new InMemoryD1Statement(this.database, this.sql, parameters);
  }

  async run() {
    if (this.sql.includes('INSERT INTO documents')) {
      return this.upsertDocument();
    }

    if (this.sql.includes('INSERT INTO sync_clients')) {
      return this.upsertSyncClient();
    }

    if (this.sql.includes('INSERT OR IGNORE INTO document_updates')) {
      return this.insertDocumentUpdate();
    }

    throw new Error(`Unsupported run statement: ${this.sql}`);
  }

  async first<Row>() {
    if (this.sql.includes('FROM documents') && this.sql.includes('book_id')) {
      return this.selectDocumentMetadata() as Row | null;
    }

    if (this.sql.includes('FROM documents')) {
      return this.selectDocumentOwner() as Row | null;
    }

    if (this.sql.includes('FROM sync_clients')) {
      return this.selectSyncClient() as Row | null;
    }

    throw new Error(`Unsupported first statement: ${this.sql}`);
  }

  async all<Row>() {
    if (this.sql.includes('FROM document_updates')) {
      return { results: this.selectDocumentUpdates() as Row[] };
    }

    throw new Error(`Unsupported all statement: ${this.sql}`);
  }

  private upsertDocument() {
    const [
      id,
      owner_id,
      book_id,
      chapter_id,
      title,
      kind,
      sort_order,
      created_at,
      updated_at,
      archived_at,
    ] = this.parameters;
    const existingDocument = this.database.documents.get(String(id));

    if (existingDocument && existingDocument.owner_id !== owner_id) {
      return d1Result(0);
    }

    this.database.documents.set(String(id), {
      archived_at: nullableString(archived_at),
      book_id: String(book_id),
      chapter_id: nullableString(chapter_id),
      created_at: String(created_at),
      id: String(id),
      kind: asDocumentKind(kind),
      owner_id: String(owner_id),
      sort_order: Number(sort_order),
      title: String(title),
      updated_at: String(updated_at),
    });

    return d1Result(1);
  }

  private upsertSyncClient() {
    const [id, owner_id] = this.parameters;
    const existingClient = this.database.syncClients.get(String(id));

    if (existingClient && existingClient.owner_id !== owner_id) {
      return d1Result(0);
    }

    this.database.syncClients.set(String(id), { id: String(id), owner_id: String(owner_id) });

    return d1Result(1);
  }

  private insertDocumentUpdate() {
    const [id, owner_id, document_id, client_id, update_blob, created_at] = this.parameters;

    if (this.database.updates.has(String(id))) {
      return d1Result(0);
    }

    this.database.updates.set(String(id), {
      client_id: String(client_id),
      created_at: String(created_at),
      document_id: String(document_id),
      id: String(id),
      owner_id: String(owner_id),
      update_blob: update_blob as ArrayBuffer,
    });

    return d1Result(1);
  }

  private selectDocumentMetadata() {
    const [id, owner_id] = this.parameters;
    const document = this.database.documents.get(String(id));

    return document?.owner_id === owner_id ? document : null;
  }

  private selectDocumentOwner() {
    const [id, owner_id] = this.parameters;
    const document = this.database.documents.get(String(id));

    if (!document || document.owner_id !== owner_id) {
      return null;
    }

    return { id: document.id };
  }

  private selectSyncClient() {
    const [id, owner_id] = this.parameters;
    const client = this.database.syncClients.get(String(id));

    if (!client || client.owner_id !== owner_id) {
      return null;
    }

    return { id: client.id };
  }

  private selectDocumentUpdates() {
    const usesCheckpoint = this.sql.includes('WITH checkpoint');
    const ownerId = String(this.parameters[usesCheckpoint ? 3 : 0]);
    const documentId = String(this.parameters[usesCheckpoint ? 4 : 1]);
    const afterUpdateId = usesCheckpoint ? String(this.parameters[2]) : null;
    const checkpoint = afterUpdateId ? this.database.updates.get(afterUpdateId) : null;

    return Array.from(this.database.updates.values())
      .filter((update) => update.owner_id === ownerId && update.document_id === documentId)
      .filter((update) => !checkpoint || isAfterCheckpoint(update, checkpoint))
      .sort(compareUpdates);
  }
}

function isAfterCheckpoint(update: StoredUpdate, checkpoint: StoredUpdate) {
  return (
    update.created_at > checkpoint.created_at ||
    (update.created_at === checkpoint.created_at && update.id > checkpoint.id)
  );
}

function compareUpdates(left: StoredUpdate, right: StoredUpdate) {
  return left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id);
}

function d1Result(changes: number) {
  return { meta: { changes }, success: true };
}

function nullableString(value: unknown) {
  return value === null ? null : String(value);
}

function asDocumentKind(value: unknown): StoredDocument['kind'] {
  if (value === 'draft' || value === 'episode' || value === 'note') {
    return value;
  }

  throw new Error(`Invalid document kind: ${String(value)}`);
}

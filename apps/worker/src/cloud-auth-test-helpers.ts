import type { EnvWithCloudAuth } from './cloud-auth-env';

interface EmailSender {
  send(input: {
    from: string;
    html: string;
    subject: string;
    text: string;
    to: string;
  }): Promise<unknown>;
}

interface StoredUser {
  email: string;
  id: string;
  last_seen_at: string | null;
}

interface StoredLoginCode {
  attempt_count: number;
  code_hash: string;
  consumed_at: string | null;
  created_at: string;
  email: string;
  expires_at: string;
  id: string;
}

interface StoredAuthSession {
  token_hash: string;
  user_id: string;
}

interface StoredEntitlement {
  user_id: string;
}

export function createAuthTestEnv(input: {
  authSecret?: string;
  emailFrom?: string;
  hasEmailSender?: boolean;
}): EnvWithCloudAuth {
  return {
    AUTH_EMAIL_FROM: input.emailFrom ?? 'Goyo <no-reply@goyo.seokjun.kim>',
    DB: new InMemoryAuthDatabase() as unknown as D1Database,
    EMAIL:
      input.hasEmailSender !== false
        ? (new MockEmailSender() as unknown as EmailSender)
        : undefined,
    GOYO_AUTH_SECRET: input.authSecret ?? 'test-auth-secret',
  };
}

export class MockEmailSender {
  readonly sent: Array<{ code: string; email: string }> = [];

  async send(input: { html: string; text: string; to: string }) {
    const match =
      /code is <strong>(\d{6})<\/strong>/.exec(input.html) ?? /code is (\d{6})\./.exec(input.text);
    const code = match?.[1] ?? 'unknown';
    this.sent.push({ code, email: input.to });
    return { messageId: `message_${crypto.randomUUID()}` };
  }
}

class InMemoryAuthDatabase {
  readonly users = new Map<string, StoredUser>();
  readonly loginCodes = new Map<string, StoredLoginCode>();
  readonly authSessions = new Map<string, StoredAuthSession>();
  readonly entitlements = new Map<string, StoredEntitlement>();

  prepare(sql: string) {
    return new InMemoryAuthStatement(this, sql);
  }
}

class InMemoryAuthStatement {
  private readonly params: unknown[];

  constructor(
    private readonly database: InMemoryAuthDatabase,
    private readonly sql: string,
    params: unknown[] = [],
  ) {
    this.params = params;
  }

  bind(...params: unknown[]) {
    return new InMemoryAuthStatement(this.database, this.sql, params);
  }

  async run() {
    if (this.sql.includes('INSERT INTO login_codes')) {
      this.insertLoginCode();
    } else if (this.sql.includes('UPDATE login_codes') && this.sql.includes('attempt_count')) {
      this.incrementAttempts();
    } else if (this.sql.includes('UPDATE login_codes') && this.sql.includes('consumed_at')) {
      this.consumeCode();
    } else if (this.sql.includes('INSERT INTO users')) {
      this.insertUser();
    } else if (this.sql.includes('UPDATE users')) {
      this.touchUser();
    } else if (this.sql.includes('INSERT INTO auth_sessions')) {
      this.insertSession();
    } else if (this.sql.includes('UPDATE auth_sessions') && this.sql.includes('revoked_at')) {
      this.revokeSession();
    } else if (this.sql.includes('UPDATE auth_sessions') && this.sql.includes('last_seen_at')) {
      this.touchSession();
    } else if (this.sql.includes('INSERT OR IGNORE INTO account_entitlements')) {
      this.ensureEntitlement();
    }

    return { meta: { changes: 1 }, success: true };
  }

  async first<Row>() {
    if (this.sql.includes('FROM login_codes')) {
      return this.getLatestLoginCode() as Row | null;
    }

    if (this.sql.includes('FROM users')) {
      return this.getUser() as Row | null;
    }

    if (this.sql.includes('FROM auth_sessions')) {
      return this.getSession() as Row | null;
    }

    return null;
  }

  private insertLoginCode() {
    const [id, email, codeHash, createdAt, expiresAt] = this.params;
    this.database.loginCodes.set(String(id), {
      attempt_count: 0,
      code_hash: String(codeHash),
      consumed_at: null,
      created_at: String(createdAt),
      email: String(email),
      expires_at: String(expiresAt),
      id: String(id),
    });
  }

  private incrementAttempts() {
    const [id] = this.params;
    const code = this.database.loginCodes.get(String(id));
    if (code) {
      code.attempt_count += 1;
    }
  }

  private consumeCode() {
    const [consumedAt, id] = this.params;
    const code = this.database.loginCodes.get(String(id));
    if (code) {
      code.consumed_at = String(consumedAt);
    }
  }

  private insertUser() {
    const [id, email, _createdAt, lastSeenAt] = this.params;
    this.database.users.set(String(id), {
      email: String(email),
      id: String(id),
      last_seen_at: String(lastSeenAt),
    });
  }

  private touchUser() {
    const [lastSeenAt, userId] = this.params;
    const user = this.database.users.get(String(userId));
    if (user) {
      user.last_seen_at = String(lastSeenAt);
    }
  }

  private insertSession() {
    const [_id, userId, tokenHash] = this.params;
    this.database.authSessions.set(String(tokenHash), {
      token_hash: String(tokenHash),
      user_id: String(userId),
    });
  }

  private revokeSession() {
    const [_revokedAt, tokenHash] = this.params;
    this.database.authSessions.delete(String(tokenHash));
  }

  private touchSession() {
    // no-op for test double; last_seen_at irrelevant to revoke check
  }

  private ensureEntitlement() {
    const [userId] = this.params;
    this.database.entitlements.set(String(userId), { user_id: String(userId) });
  }

  private getLatestLoginCode() {
    const [email] = this.params;
    const candidates = Array.from(this.database.loginCodes.values())
      .filter((code) => code.email === email && !code.consumed_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const candidate = candidates[0];
    return candidate ? { ...candidate } : null;
  }

  private getUser() {
    const [email] = this.params;
    const user = Array.from(this.database.users.values()).find((u) => u.email === email);
    return user ? { ...user, created_at: user.last_seen_at ?? '' } : null;
  }

  private getSession() {
    const [tokenHash] = this.params;
    const session = this.database.authSessions.get(String(tokenHash));
    if (!session) return null;

    const user = this.database.users.get(session.user_id);
    return user ? { email: user.email, user_id: session.user_id } : null;
  }
}

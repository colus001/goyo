interface EmailSender {
  send(input: {
    from: string;
    html: string;
    subject: string;
    text: string;
    to: string;
  }): Promise<unknown>;
}

export interface EnvWithCloudAuth {
  APP_ENV?: string;
  AUTH_DEV_LOGIN_CODE?: string;
  AUTH_EMAIL_FROM?: string;
  DB: D1Database;
  EMAIL?: EmailSender;
  GOYO_AUTH_SECRET?: string;
}

const LOCAL_DEV_AUTH_SECRET = 'goyo-local-dev-auth-secret';

export function getCloudAuthSecret(env: EnvWithCloudAuth): string | null {
  return env.GOYO_AUTH_SECRET ?? (env.APP_ENV === 'development' ? LOCAL_DEV_AUTH_SECRET : null);
}

export function getLocalDevAuthSecret(): string {
  return LOCAL_DEV_AUTH_SECRET;
}

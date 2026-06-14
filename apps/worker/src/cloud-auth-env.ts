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
  AUTH_EMAIL_FROM?: string;
  DB: D1Database;
  EMAIL?: EmailSender;
  GOYO_AUTH_SECRET?: string;
}

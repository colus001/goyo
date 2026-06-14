import type { EnvWithCloudAuth } from './cloud-auth-env';
import { getStorageErrorMessage } from './http';

const AUTH_EMAIL_FROM = 'Goyo <no-reply@goyo.seokjun.kim>';

export async function sendLoginCodeEmail(env: EnvWithCloudAuth, email: string, code: string) {
  try {
    await env.EMAIL?.send({
      from: env.AUTH_EMAIL_FROM ?? AUTH_EMAIL_FROM,
      html: `<p>Your Goyo Cloud login code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
      subject: 'Your Goyo Cloud login code',
      text: `Your Goyo Cloud login code is ${code}. This code expires in 10 minutes.`,
      to: email,
    });
  } catch (error) {
    throw new Error(getStorageErrorMessage(error));
  }
}

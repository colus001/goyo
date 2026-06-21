import type { EnvWithCloudAuth } from './cloud-auth-env';

const DEFAULT_LOCAL_DEV_LOGIN_CODE = '000000';

export function getLocalDevLoginCode(env: EnvWithCloudAuth): string | null {
  if (env.APP_ENV !== 'development') {
    return null;
  }

  if (isLoginCode(env.AUTH_DEV_LOGIN_CODE)) {
    return env.AUTH_DEV_LOGIN_CODE;
  }

  return DEFAULT_LOCAL_DEV_LOGIN_CODE;
}

function isLoginCode(value: string | undefined): value is string {
  return typeof value === 'string' && /^\d{6}$/.test(value);
}

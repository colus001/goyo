import type { AuthUser } from '@writer/shared';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'goyo_cloud_token';
const USER_KEY = 'goyo_cloud_user';

export interface MobileAuthSession {
  token: string;
  user: AuthUser;
}

export async function getMobileAuthSession(): Promise<MobileAuthSession | null> {
  const [token, userJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);

  if (!token || !userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson) as AuthUser;

    return user.email && user.id ? { token, user } : null;
  } catch {
    await clearMobileAuthSession();
    return null;
  }
}

export async function saveMobileAuthSession(session: MobileAuthSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, session.token),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function clearMobileAuthSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

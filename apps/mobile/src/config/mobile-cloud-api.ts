const LOCAL_GOYO_CLOUD_API_URL = 'http://127.0.0.1:8787';
const PRODUCTION_GOYO_CLOUD_API_URL = 'https://goyo-api.seokjun.kim';

declare const __DEV__: boolean;

export const GOYO_CLOUD_API_URL = normalizeApiUrl(
  process.env.EXPO_PUBLIC_GOYO_CLOUD_API_URL ??
    (__DEV__ ? LOCAL_GOYO_CLOUD_API_URL : PRODUCTION_GOYO_CLOUD_API_URL),
);

function normalizeApiUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

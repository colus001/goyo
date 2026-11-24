import { afterEach, expect, it, vi } from 'vitest';
import type { CoachAccountRecord } from './writing-coach-credentials';
import { WritingCoachProviders } from './writing-coach-provider';

const nativeFetch = globalThis.fetch;
afterEach(() => vi.unstubAllGlobals());

it('releases sign-in on cancel, even if an old token exchange is still running', async () => {
  const saved: CoachAccountRecord[] = [];
  const started = deferred<void>();
  const oldExchange = deferred<Response>();
  const retryExchange = deferred<Response>();
  const retryStarted = deferred<void>();
  let browsersOpened = 0;

  vi.stubGlobal('fetch', async (_input: unknown, init: RequestInit) => {
    const { code } = JSON.parse(String(init.body)) as { code: string };
    if (code === '1') {
      started.resolve();
      return oldExchange.promise; // Reproduce a provider still finishing work after abort.
    }
    retryStarted.resolve();
    return retryExchange.promise;
  });

  const providers = new WritingCoachProviders(
    {
      list: () => saved,
      save: (account) => saved.push(account),
      remove: () => undefined,
      hostId: () => 'test-host',
      requireEncryption: () => undefined,
    },
    async (url) => {
      const auth = new URL(url);
      const callback = new URL(auth.searchParams.get('callback_url') ?? '');
      callback.searchParams.set('state', auth.searchParams.get('state') ?? '');
      callback.searchParams.set('code', String(++browsersOpened));
      const response = await nativeFetch(callback);
      expect(response.status).toBe(200);
    },
  );

  const first = providers.connect('openrouter');
  const cancelled = expect(first).rejects.toThrow('Sign-in was cancelled');
  await started.promise;
  providers.cancelConnect();
  const second = providers.connect('openrouter');
  await retryStarted.promise;
  oldExchange.resolve(Response.json({ key: 'stale-key' }));
  await cancelled;
  expect(saved).toEqual([]);
  await expect(providers.connect('openrouter')).rejects.toThrow('already in progress');
  retryExchange.resolve(Response.json({ key: 'new-key' }));
  await expect(second).resolves.toMatchObject({ providerID: 'openrouter', signedIn: true });
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ token: 'new-key' });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

import { afterEach, expect, it, vi } from 'vitest';
import type { CoachKeyConnection } from '../shared/writing-coach';
import { listProviderPresets } from './writing-coach-catalog';
import { connectKey, generateDirect, listDirectModels } from './writing-coach-direct';

afterEach(() => vi.unstubAllGlobals());

it('connects keyless local models and never redirects requests or sends them to unencrypted remote endpoints', async () => {
  const endpoint = 'http://127.0.0.1:11434/v1';
  vi.stubGlobal('fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const request = new Request(input, init);
    expect(request.redirect).toBe('error');
    expect(request.headers.has('authorization')).toBe(false);
    expect(request.url).toBe(`${endpoint}/chat/completions`);
    return Response.json({
      choices: [{ finish_reason: 'stop', message: { content: 'Local feedback' } }],
    });
  });
  const input: CoachKeyConnection = {
    providerID: 'custom',
    token: '',
    label: 'Ollama',
    protocol: 'chat-completions',
    modelIds: ['local:model'],
    endpoint,
  };
  await expect(connectKey({ ...input, endpoint: 'http://provider.example/v1' })).rejects.toThrow(
    'Use HTTPS',
  );
  const account = await connectKey(input);
  if (account.providerID !== 'custom') throw new Error('Unexpected provider');
  await expect(listDirectModels(account)).resolves.toEqual([
    { id: 'local:model', name: 'local:model' },
  ]);
  await expect(generateDirect(account, 'local:model', 'Sample')).resolves.toBe('Local feedback');
});

it('offers preset suggestions only for compatible endpoints without sending credentials to the catalog', async () => {
  vi.stubGlobal('fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const request = new Request(input, init);
    expect(request.url).toBe('https://models.dev/api.json');
    expect(request.headers.has('authorization')).toBe(false);
    return Response.json({
      good: { name: 'Good', api: 'https://provider.example/v1', npm: '@ai-sdk/openai-compatible' },
      http: {
        name: 'Insecure',
        api: 'http://provider.example/v1',
        npm: '@ai-sdk/openai-compatible',
      },
      special: {
        name: 'Special',
        api: 'https://provider.example/v1',
        npm: '@ai-sdk/amazon-bedrock',
      },
    });
  });
  const presets = await listProviderPresets();
  expect(presets.find(({ id }) => id === 'good')).toMatchObject({ protocol: 'chat-completions' });
  expect(presets.some(({ id }) => id === 'http' || id === 'special')).toBe(false);
  expect(presets.some(({ id }) => id === 'ollama')).toBe(true);
});

it.each([
  {
    protocol: 'responses',
    path: '/responses',
    header: 'authorization',
    value: 'Bearer example-key',
    reply: {
      status: 'completed',
      output: [{ content: [{ type: 'output_text', text: 'Feedback' }] }],
    },
  },
  {
    protocol: 'messages',
    path: '/messages',
    header: 'x-api-key',
    value: 'example-key',
    reply: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Feedback' }] },
  },
  {
    protocol: 'generate-content',
    path: '/models/example-model:generateContent',
    header: 'x-goog-api-key',
    value: 'example-key',
    reply: { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Feedback' }] } }] },
  },
] as const)('uses the selected $protocol transport and credential header', async (entry) => {
  const endpoint = 'https://provider.example/v1';
  vi.stubGlobal('fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const request = new Request(input, init);
    expect(request.url).toBe(`${endpoint}${entry.path}`);
    expect(request.headers.get(entry.header)).toBe(entry.value);
    const body = await request.text();
    expect(body).toContain('Sample manuscript');
    expect(body).not.toContain('"tools"');
    return Response.json(entry.reply);
  });
  const account = await connectKey({
    providerID: 'custom',
    token: 'example-key',
    label: 'Direct',
    protocol: entry.protocol,
    modelIds: ['example-model'],
    endpoint,
  });
  if (account.providerID !== 'custom') throw new Error('Unexpected provider');
  await expect(generateDirect(account, 'example-model', 'Sample manuscript')).resolves.toBe(
    'Feedback',
  );
});

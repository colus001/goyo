import { beforeEach, expect, it, vi } from 'vitest';
import { configureCloudAccount, generateCloudReply } from './writing-coach-cloud';

const mock = vi.hoisted(() => ({
  bedrock: vi.fn(() => ({ provider: 'bedrock' })),
  azure: vi.fn(() => ({ provider: 'azure' })),
  configureAzure: vi.fn(),
  vertex: vi.fn(() => ({ provider: 'vertex' })),
  vertexAnthropic: vi.fn(() => ({ provider: 'vertex-anthropic' })),
  generate: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock('@opencode/ai/providers/amazon-bedrock', () => ({ model: mock.bedrock }));
vi.mock('@opencode/ai/providers/azure', () => ({ configure: mock.configureAzure }));
vi.mock('@opencode/ai/route', () => ({ Auth: { bearer: (token: string) => ({ bearer: token }) } }));
vi.mock('@opencode/ai/providers/google-vertex', () => ({ model: mock.vertex }));
vi.mock('@opencode/ai/providers/google-vertex/messages', () => ({ model: mock.vertexAnthropic }));
vi.mock('@opencode/ai', () => ({ ai: { generate: mock.generate } }));
vi.mock('@azure/identity', () => ({
  AzureCliCredential: class {
    getToken = mock.getToken;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.configureAzure.mockReturnValue({ responses: mock.azure });
  mock.generate.mockResolvedValue({ finishReason: { normalized: 'stop' }, text: 'Feedback' });
});

it('passes the AWS SSO profile to the reused Bedrock adapter and sends text only', async () => {
  const account = configureCloudAccount({
    providerID: 'amazon-bedrock',
    region: 'us-west-2',
    profile: 'work-sso',
    modelIds: ['us.anthropic.claude-sonnet', 'us.anthropic.claude-sonnet'],
  });
  expect(account.modelIds).toEqual(['us.anthropic.claude-sonnet']);
  await expect(generateCloudReply(account, account.modelIds[0] ?? '', 'Sample text')).resolves.toBe(
    'Feedback',
  );
  expect(mock.bedrock).toHaveBeenCalledWith('us.anthropic.claude-sonnet', {
    region: 'us-west-2',
    profile: 'work-sso',
    auth: 'sigv4',
  });
  const payload = mock.generate.mock.calls[0]?.[0];
  expect(payload).toMatchObject({
    model: { provider: 'bedrock' },
    system: expect.any(String),
    prompt: 'Sample text',
  });
  expect(payload).not.toHaveProperty('tools');
});

it('passes Vertex project and location to the Gemini and Claude adapters', async () => {
  const account = configureCloudAccount({
    providerID: 'google-vertex',
    project: 'writer-project',
    location: 'global',
    modelIds: ['gemini-example', 'claude-example@default'],
  });
  await generateCloudReply(account, 'gemini-example', 'Sample');
  await generateCloudReply(account, 'claude-example@default', 'Sample');
  const config = { project: 'writer-project', location: 'global' };
  expect(mock.vertex).toHaveBeenCalledWith('gemini-example', config);
  expect(mock.vertexAnthropic).toHaveBeenCalledWith('claude-example@default', config);
});

it('uses the Azure CLI token and the selected deployment, and disables response storage', async () => {
  mock.getToken.mockResolvedValue({ token: 'example-entra-token' });
  const account = configureCloudAccount({
    providerID: 'azure',
    resource: 'goyo-test',
    modelIds: ['prod-deployment'],
  });
  await expect(generateCloudReply(account, 'prod-deployment', 'Sample')).resolves.toBe('Feedback');
  expect(mock.getToken).toHaveBeenCalledWith('https://cognitiveservices.azure.com/.default', {
    abortSignal: expect.any(AbortSignal),
  });
  expect(mock.azure).toHaveBeenCalledWith('prod-deployment');
  expect(mock.configureAzure).toHaveBeenCalledWith({
    resourceName: 'goyo-test',
    auth: { bearer: 'example-entra-token' },
    http: { body: { store: false } },
  });
  expect(() =>
    configureCloudAccount({ ...account, providerID: 'azure', resource: 'host.evil.com' }),
  ).toThrow('resource name');
});

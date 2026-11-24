import type { CoachDirectProtocol, CoachProviderPreset } from '../shared/writing-coach';

const DEFAULT_PRESETS: CoachProviderPreset[] = [
  {
    id: 'opencode',
    label: 'OpenCode Console (paid API)',
    endpoint: 'https://opencode.ai/inference/openai/v1',
    protocol: 'chat-completions',
  },
  {
    id: 'openai',
    label: 'OpenAI API',
    endpoint: 'https://api.openai.com/v1',
    protocol: 'responses',
  },
  {
    id: 'anthropic',
    label: 'Anthropic API',
    endpoint: 'https://api.anthropic.com/v1',
    protocol: 'messages',
  },
  {
    id: 'google',
    label: 'Google Gemini API',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    protocol: 'generate-content',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    endpoint: 'http://127.0.0.1:11434/v1',
    protocol: 'chat-completions',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    endpoint: 'http://127.0.0.1:1234/v1',
    protocol: 'chat-completions',
  },
  {
    id: 'groq',
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    protocol: 'chat-completions',
  },
];
const EXCLUDED = new Set(['github-copilot', 'opencode-go', 'openrouter']);
const PROTOCOL_BY_PACKAGE = new Map<string, CoachDirectProtocol>([
  ['@ai-sdk/openai-compatible', 'chat-completions'],
  ['@ai-sdk/openai', 'responses'],
  ['@ai-sdk/anthropic', 'messages'],
  ['@ai-sdk/google', 'generate-content'],
]);

export async function listProviderPresets() {
  const presets = new Map(DEFAULT_PRESETS.map((preset) => [preset.id, preset]));
  try {
    const response = await fetch('https://models.dev/api.json', {
      redirect: 'error',
      signal: AbortSignal.timeout(6_000),
    });
    if (response.ok) {
      const catalog = (await response.json()) as Record<
        string,
        { npm?: string; api?: string; name?: string }
      >;
      for (const [id, provider] of Object.entries(catalog)) {
        if (presets.has(id) || EXCLUDED.has(id)) continue;
        const preset = readCatalogPreset(id, provider);
        if (preset) presets.set(id, preset);
      }
    }
  } catch {
    // The fixed presets and manual entry still work without the public catalog.
  }
  return [...presets.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function readCatalogPreset(
  id: string,
  provider: { npm?: string; api?: string; name?: string } | null,
): CoachProviderPreset | undefined {
  if (typeof provider?.name !== 'string' || typeof provider.api !== 'string') return;
  const protocol = PROTOCOL_BY_PACKAGE.get(provider.npm ?? '');
  const url = URL.parse(provider.api);
  if (
    !protocol ||
    !url ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    return;
  return { id, label: provider.name, endpoint: url.href.replace(/\/+$/, ''), protocol };
}

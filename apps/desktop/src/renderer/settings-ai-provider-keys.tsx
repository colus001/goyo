import { type FormEvent, useEffect, useState } from 'react';
import type {
  CoachDirectProtocol,
  CoachKeyConnection,
  CoachProviderAccount,
  CoachProviderPreset,
} from '../shared/writing-coach';
import { AppButton } from './app-button';

const INPUT =
  'w-full rounded-lg border border-[var(--goyo-border)] bg-[var(--goyo-paper)] px-3 py-2 text-sm';
const CARD =
  'space-y-3 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-4';

export function KeyProviderSettings({
  accounts,
  disabled,
  onConnected,
  onDisconnect,
}: {
  accounts: CoachProviderAccount[];
  disabled: boolean;
  onConnected: (account: CoachProviderAccount) => void;
  onDisconnect: (account: CoachProviderAccount) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const api = window.writerDesktop.writingCoach;
  async function connect(input: CoachKeyConnection) {
    setMessage('');
    setBusy(true);
    try {
      const result = await api.connectKey(input);
      if (result.ok) {
        onConnected(result.data);
        return true;
      }
      setMessage(result.error);
    } catch {
      setMessage('Could not connect to the provider.');
    } finally {
      setBusy(false);
    }
    return false;
  }
  const locked = disabled || busy;
  return (
    <>
      <section className={CARD} aria-label="OpenCode Go">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-medium">OpenCode Go</h3>
            <p className="mt-1 text-[var(--goyo-text-muted)] text-sm">
              Connect your Go subscription directly with a subscriber key.
            </p>
          </div>
          <AppButton onClick={() => void api.openUsage('opencode-go')} size="sm" variant="ghost">
            Go Console
          </AppButton>
        </div>
        <GoConnection disabled={locked} onConnect={connect} />
        <ConnectedAccounts
          accounts={accounts.filter((account) => account.providerID === 'opencode-go')}
          disabled={locked}
          onDisconnect={onDisconnect}
        />
      </section>
      <section className={CARD} aria-label="Direct API providers">
        <div>
          <h3 className="font-medium">Direct API providers</h3>
          <p className="mt-1 text-[var(--goyo-text-muted)] text-sm">
            Choose a provider from the catalog or enter an API endpoint yourself.
          </p>
        </div>
        <DirectConnection disabled={locked} onConnect={connect} />
        <ConnectedAccounts
          accounts={accounts.filter((account) => account.providerID === 'custom')}
          disabled={locked}
          onDisconnect={onDisconnect}
        />
      </section>
      {(busy || message) && (
        <p className="text-[var(--goyo-text-muted)] text-sm" role="status">
          {busy ? 'Connecting to the provider…' : message}
        </p>
      )}
    </>
  );
}

interface FormProps {
  disabled: boolean;
  onConnect: (input: CoachKeyConnection) => Promise<boolean>;
}

function GoConnection({ disabled, onConnect }: FormProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const token = String(new FormData(form).get('key') ?? '');
    if (await onConnect({ providerID: 'opencode-go', token })) form.reset();
  }
  return (
    <form className="flex flex-wrap gap-2" onSubmit={(event) => void submit(event)}>
      <input
        aria-label="OpenCode Go subscriber key"
        autoComplete="off"
        className={`${INPUT} min-w-36 flex-1`}
        disabled={disabled}
        name="key"
        placeholder="Subscriber API key"
        required
        type="password"
      />
      <AppButton disabled={disabled} size="sm" type="submit" variant="primary">
        Connect Go
      </AppButton>
    </form>
  );
}

function useProviderPresets() {
  const [presets, setPresets] = useState<CoachProviderPreset[]>([]);
  useEffect(() => {
    void window.writerDesktop.writingCoach
      .listProviderPresets()
      .then((result) => {
        if (result.ok) setPresets(result.data);
      })
      .catch(() => undefined);
  }, []);
  return presets;
}

function DirectConnection({ disabled, onConnect }: FormProps) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-medium text-[var(--goyo-text-muted)] text-sm">
        Add an API provider
      </summary>
      {open && <DirectProviderForm disabled={disabled} onConnect={onConnect} />}
    </details>
  );
}

function DirectProviderForm({ disabled, onConnect }: FormProps) {
  const presets = useProviderPresets();
  const [presetId, setPresetId] = useState('');
  const preset = presets.find((item) => item.id === presetId);
  return (
    <div className="mt-3 space-y-2">
      <select
        aria-label="Provider preset"
        className={INPUT}
        disabled={disabled}
        onChange={(event) => setPresetId(event.target.value)}
        value={presetId}
      >
        <option value="">Custom provider</option>
        {presets.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <EndpointFields
        key={preset?.id ?? 'manual'}
        disabled={disabled}
        onConnect={onConnect}
        preset={preset}
      />
    </div>
  );
}

function EndpointFields({
  disabled,
  onConnect,
  preset,
}: FormProps & { preset?: CoachProviderPreset }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const token = String(data.get('key') ?? '');
    const label = String(data.get('label') ?? '');
    const endpoint = String(data.get('endpoint') ?? '');
    const protocol = data.get('protocol') as CoachDirectProtocol;
    const modelIds = String(data.get('models') ?? '')
      .split('\n')
      .map((id) => id.trim())
      .filter(Boolean);
    if (await onConnect({ providerID: 'custom', token, label, endpoint, protocol, modelIds }))
      form.reset();
  }
  return (
    <form className="grid gap-2" onSubmit={(event) => void submit(event)}>
      <fieldset className="grid gap-2" disabled={disabled}>
        <input
          aria-label="Provider label"
          className={INPUT}
          defaultValue={preset?.label}
          name="label"
          placeholder="Provider name"
          required
        />
        <input
          aria-label="API base URL"
          className={INPUT}
          defaultValue={preset?.endpoint}
          name="endpoint"
          placeholder="API base URL"
          required
          type="url"
        />
        <select
          aria-label="API protocol"
          className={INPUT}
          defaultValue={preset?.protocol ?? 'chat-completions'}
          name="protocol"
        >
          <option value="chat-completions">OpenAI-compatible Chat Completions</option>
          <option value="responses">OpenAI-compatible Responses</option>
          <option value="messages">Anthropic-compatible Messages</option>
          <option value="generate-content">Google Gemini GenerateContent</option>
        </select>
        <input
          aria-label="Provider API key"
          autoComplete="off"
          className={INPUT}
          name="key"
          placeholder="API key (optional for local endpoints)"
          type="password"
        />
        <textarea
          aria-label="Optional model IDs"
          className={INPUT}
          name="models"
          placeholder="Model IDs, one per line (optional)"
          rows={2}
        />
      </fieldset>
      <p className="text-[var(--goyo-text-muted)] text-xs">
        Confirm the endpoint before sending your key. If you enter model IDs, the connection is
        checked on your first request.
      </p>
      <AppButton disabled={disabled} size="sm" type="submit" variant="primary">
        Connect provider
      </AppButton>
    </form>
  );
}

function ConnectedAccounts({
  accounts,
  disabled,
  onDisconnect,
}: {
  accounts: CoachProviderAccount[];
  disabled: boolean;
  onDisconnect: (account: CoachProviderAccount) => void;
}) {
  return accounts.map((account) => (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-[var(--goyo-border)] border-t pt-2 text-xs"
      key={account.id}
    >
      <span>
        {account.label} · {account.id.slice(0, 8)}
      </span>
      <AppButton
        disabled={disabled}
        onClick={() => onDisconnect(account)}
        size="sm"
        variant="ghost"
      >
        Disconnect
      </AppButton>
    </div>
  ));
}

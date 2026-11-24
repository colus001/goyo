import { type FormEvent, useState } from 'react';
import {
  COACH_PROVIDER_NAMES,
  type CoachCloudConnection,
  type CoachProviderAccount,
} from '../shared/writing-coach';
import { AppButton } from './app-button';

type CloudProvider = CoachCloudConnection['providerID'];
const CLOUD_PROVIDERS = ['amazon-bedrock', 'google-vertex', 'azure'] as const;
const FIELD =
  'w-full rounded-lg border border-[var(--goyo-border)] bg-[var(--goyo-paper)] px-3 py-2 text-sm';

export function CloudProviderSettings({
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
  const [provider, setProvider] = useState<CloudProvider>('amazon-bedrock');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = disabled || busy;
  const cloudAccounts = accounts.filter(
    ({ providerID }) =>
      providerID === 'amazon-bedrock' || providerID === 'google-vertex' || providerID === 'azure',
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage('');
    try {
      const result = await window.writerDesktop.writingCoach.connectCloud(
        getConnection(provider, new FormData(form)),
      );
      if (!result.ok) return setMessage(result.error);
      onConnected(result.data);
      form.reset();
      setMessage('Configuration saved. Credentials will be checked on the first request.');
    } catch {
      setMessage('Could not save this provider.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Cloud accounts"
      className="space-y-3 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-4"
    >
      <h3 className="font-medium">Cloud accounts</h3>
      <p className="text-[var(--goyo-text-muted)] text-sm">
        Use your local cloud login without pasting a secret into Goyo.
      </p>
      <details>
        <summary className="cursor-pointer font-medium text-[var(--goyo-text-muted)] text-sm">
          Add a cloud provider
        </summary>
        <form className="mt-3 grid gap-2" onSubmit={(event) => void submit(event)}>
          <select
            aria-label="Cloud provider"
            className={FIELD}
            disabled={locked}
            onChange={(event) => setProvider(event.target.value as CloudProvider)}
            value={provider}
          >
            {CLOUD_PROVIDERS.map((id) => (
              <option key={id} value={id}>
                {COACH_PROVIDER_NAMES[id]}
              </option>
            ))}
          </select>
          <fieldset className="grid gap-2" disabled={locked} key={provider}>
            <CloudFields provider={provider} />
            <textarea
              aria-label="Model or deployment IDs"
              className={FIELD}
              name="models"
              placeholder="Model or deployment IDs, one per line"
              required
              rows={2}
            />
          </fieldset>
          <AppButton disabled={locked} size="sm" type="submit" variant="primary">
            Connect cloud provider
          </AppButton>
        </form>
      </details>
      <CloudAccounts accounts={cloudAccounts} disabled={locked} onDisconnect={onDisconnect} />
      {message && (
        <p className="text-[var(--goyo-text-muted)] text-sm" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function CloudAccounts({
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
      className="flex items-center justify-between gap-2 border-[var(--goyo-border)] border-t pt-2 text-xs"
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

function CloudFields({ provider }: { provider: CloudProvider }) {
  switch (provider) {
    case 'amazon-bedrock':
      return (
        <>
          <p className="text-[var(--goyo-text-muted)] text-xs">
            Use an existing AWS profile, including one signed in with AWS SSO.
          </p>
          <input
            aria-label="AWS profile"
            className={FIELD}
            name="profile"
            placeholder="AWS profile (optional)"
          />
          <input
            aria-label="AWS region"
            className={FIELD}
            defaultValue="us-east-1"
            name="region"
            required
          />
        </>
      );
    case 'google-vertex':
      return (
        <>
          <p className="text-[var(--goyo-text-muted)] text-xs">
            Uses Application Default Credentials. For a local login, run{' '}
            <code>gcloud auth application-default login</code>.
          </p>
          <input
            aria-label="Google Cloud project ID"
            className={FIELD}
            name="project"
            placeholder="Google Cloud project ID"
            required
          />
          <input
            aria-label="Vertex location"
            className={FIELD}
            defaultValue="us-central1"
            name="location"
            required
          />
        </>
      );
    case 'azure':
      return (
        <>
          <p className="text-[var(--goyo-text-muted)] text-xs">
            Uses Microsoft Entra ID from <code>az login</code>. Enter deployment names as model IDs.
          </p>
          <input
            aria-label="Azure OpenAI resource name"
            className={FIELD}
            name="resource"
            placeholder="Azure OpenAI resource name"
            required
          />
        </>
      );
  }
}

function getConnection(provider: CloudProvider, data: FormData): CoachCloudConnection {
  const read = (name: string) => String(data.get(name) ?? '').trim();
  const modelIds = read('models')
    .split('\n')
    .map((id) => id.trim())
    .filter(Boolean);
  switch (provider) {
    case 'amazon-bedrock':
      return { providerID: provider, modelIds, region: read('region'), profile: read('profile') };
    case 'google-vertex':
      return {
        providerID: provider,
        modelIds,
        project: read('project'),
        location: read('location'),
      };
    case 'azure':
      return { providerID: provider, modelIds, resource: read('resource') };
  }
}

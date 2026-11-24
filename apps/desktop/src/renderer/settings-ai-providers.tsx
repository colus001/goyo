import { useEffect, useRef, useState } from 'react';
import {
  COACH_PROVIDER_NAMES,
  type CoachOAuthProviderId,
  type CoachProviderAccount,
  type CoachProviderId,
} from '../shared/writing-coach';
import { AppButton } from './app-button';
import { CloudProviderSettings } from './settings-ai-cloud';
import { KeyProviderSettings } from './settings-ai-provider-keys';
import { useAiProviderSignIn } from './use-ai-provider-sign-in';

const PROVIDER_IDS = ['chatgpt', 'openrouter'] as const;
const PROVIDER_DESCRIPTION = {
  chatgpt: 'Use eligible usage included in your ChatGPT plan or credits.',
  openrouter: 'Use models billed to your own OpenRouter credits.',
};

function useProviderSettings() {
  const api = window.writerDesktop.writingCoach;
  const [accounts, setAccounts] = useState<CoachProviderAccount[]>([]);
  const [busy, setBusy] = useState<'loading' | 'disconnecting' | null>('loading');
  const [message, setMessage] = useState('');
  const confirmation = useRef<HTMLDialogElement>(null);
  const signIn = useAiProviderSignIn((account) => {
    setAccounts((current) => upsertAccount(current, account));
    if (
      account.providerID === 'chatgpt' &&
      !accounts.some((item) => item.providerID === 'chatgpt')
    ) {
      confirmation.current?.showModal();
    }
  }, setMessage);

  useEffect(() => {
    void api
      .listAccounts()
      .then((result) => {
        if (result.ok) setAccounts(result.data);
        else setMessage(result.error);
      })
      .catch(() => setMessage('Could not load AI accounts.'))
      .finally(() => setBusy(null));
  }, [api]);

  async function disconnect(account: CoachProviderAccount) {
    setBusy('disconnecting');
    setMessage('');
    try {
      const result = await api.disconnectProvider(account.id);
      if (!result.ok) return setMessage(result.error);
      setAccounts((current) => removeConnectedAccount(current, account.id));
      if (!result.data.revocationConfirmed) setMessage(revocationNotice(account.providerID));
    } catch {
      setMessage('Could not sign out of the AI account.');
    } finally {
      setBusy(null);
    }
  }

  return {
    accounts,
    busy,
    message,
    confirmation,
    ...signIn,
    disconnect,
    api,
    onKeyConnected: (account: CoachProviderAccount) =>
      setAccounts((current) => [...current, account]),
  };
}

function upsertAccount(accounts: CoachProviderAccount[], account: CoachProviderAccount) {
  return [...accounts.filter(({ id }) => id !== account.id), account];
}

function removeConnectedAccount(accounts: CoachProviderAccount[], id: string) {
  return accounts.flatMap((item) =>
    item.id !== id ? [item] : item.providerID === 'chatgpt' ? [{ ...item, signedIn: false }] : [],
  );
}

function revocationNotice(provider: CoachProviderId) {
  if (provider === 'chatgpt')
    return 'Signed out locally. Remote revocation wasn’t confirmed; check ChatGPT Settings.';
  if (provider === 'openrouter' || provider === 'opencode-go' || provider === 'custom')
    return 'Disconnected from Goyo. Revoke the API key with your provider if you no longer need it.';
  return 'Disconnected from Goyo. The cloud login on this device is unchanged.';
}

export function AiProviderSettings() {
  const state = useProviderSettings();
  const { busy, confirmation, message, signIn } = state;
  return (
    <div className="space-y-3">
      {PROVIDER_IDS.map((provider) => (
        <ProviderCard key={provider} provider={provider} state={state} />
      ))}
      <KeyProviderSettings
        accounts={state.accounts}
        disabled={!!busy || !!signIn}
        onConnected={state.onKeyConnected}
        onDisconnect={(account) => void state.disconnect(account)}
      />
      <CloudProviderSettings
        accounts={state.accounts}
        disabled={!!busy || !!signIn}
        onConnected={state.onKeyConnected}
        onDisconnect={(account) => void state.disconnect(account)}
      />
      {message && (
        <p className="text-[var(--goyo-text-muted)] text-sm" role="status">
          {message}
        </p>
      )}
      <dialog
        aria-labelledby="chatgpt-plan-confirmation"
        className="m-auto w-[min(24rem,90vw)] rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] p-5 text-[var(--goyo-text)] backdrop:bg-black/35"
        ref={confirmation}
      >
        <h3 className="font-semibold" id="chatgpt-plan-confirmation">
          You’re using your ChatGPT plan
        </h3>
        <p className="mt-2 mb-4 text-[var(--goyo-text-muted)] text-sm">
          Eligible Goyo requests use your ChatGPT plan. Review limits and credits in ChatGPT
          Settings.
        </p>
        <form method="dialog">
          <AppButton type="submit" variant="primary">
            Got it
          </AppButton>
        </form>
      </dialog>
    </div>
  );
}

function ProviderCard({
  provider,
  state,
}: {
  provider: CoachOAuthProviderId;
  state: ReturnType<typeof useProviderSettings>;
}) {
  const { accounts, busy, connect, disconnect, api, signIn, cancel } = state;
  const workingHere = signIn?.provider === provider;
  return (
    <div className="space-y-3 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{COACH_PROVIDER_NAMES[provider]}</h3>
          <p className="mt-1 text-[var(--goyo-text-muted)] text-sm">
            {PROVIDER_DESCRIPTION[provider]}
          </p>
        </div>
        <AppButton
          disabled={!!busy || (!!signIn && !workingHere)}
          onClick={() => void connect(provider, workingHere ? signIn.accountId : undefined)}
          size="sm"
          variant="primary"
        >
          {workingHere
            ? 'Restart sign-in'
            : provider === 'chatgpt'
              ? 'Continue with ChatGPT'
              : 'Connect OpenRouter'}
        </AppButton>
      </div>
      {workingHere && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p role="status">Finish signing in in your browser.</p>
          <AppButton onClick={() => void cancel()} size="sm">
            Cancel
          </AppButton>
        </div>
      )}
      {accounts
        .filter(({ providerID }) => providerID === provider)
        .map((account) => (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-[var(--goyo-border)] border-t pt-2 text-xs"
            key={account.id}
          >
            <span>
              {account.label} · {account.id.slice(0, 8)}
              {account.signedIn ? '' : ' (signed out)'}
            </span>
            <div className="flex flex-wrap gap-1">
              {provider === 'chatgpt' && (
                <AppButton
                  disabled={!!busy || !!signIn}
                  onClick={() => void connect(provider, account.id)}
                  size="sm"
                  variant="ghost"
                >
                  Reconnect
                </AppButton>
              )}
              {account.signedIn && (
                <AppButton
                  disabled={!!busy || !!signIn}
                  onClick={() => void disconnect(account)}
                  size="sm"
                  variant="ghost"
                >
                  Sign out
                </AppButton>
              )}
            </div>
          </div>
        ))}
      <AppButton onClick={() => void api.openUsage(provider)} size="sm" variant="ghost">
        {provider === 'chatgpt' ? 'Manage usage' : 'Manage keys'}
      </AppButton>
    </div>
  );
}

import { type ReactElement, useEffect, useState } from 'react';
import type { AppSettings } from '../shared/app-settings';
import { AppButton } from './app-button';

interface GoyoCloudAccount {
  email: string;
  id: string;
}

interface GoyoCloudDevConfig {
  apiUrl: string;
  deepLinkProtocolCommand: { args: string[]; executable: string } | null;
  deepLinkProtocolRegistered: boolean;
  deepLinkProtocolScheme: string;
  userDataPath: string;
  webUrl: string;
}

type GoyoCloudSessionState = 'expired' | 'signed-in' | 'signed-out' | 'unable-to-connect';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: auth state and wiring for one UI surface
export function GoyoCloudAuthSection({
  onChangeSettings,
  settings,
}: {
  onChangeSettings: (settings: AppSettings) => void;
  settings: AppSettings;
}): ReactElement {
  const [status, setStatus] = useState<string | null>(null);
  const [account, setAccount] = useState<GoyoCloudAccount | null>(null);
  const [devConfig, setDevConfig] = useState<GoyoCloudDevConfig | null>(null);
  const [sessionState, setSessionState] = useState<GoyoCloudSessionState>('signed-out');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void Promise.all([
      window.writerDesktop.goyoCloud.getStatus(),
      window.writerDesktop.goyoCloud.getConfig(),
    ]).then(([statusResult, configResult]) => {
      setAccount(statusResult.account);
      setSessionState(statusResult.status);
      setDevConfig(configResult);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = window.writerDesktop.goyoCloud.onDeepLinkToken(() => {
      void window.writerDesktop.goyoCloud.getStatus().then((result) => {
        setSessionState(result.status);
        if (result.account) {
          setAccount(result.account);
          setStatus('Signed in via browser.');
          if (settings.sync.provider !== 'goyo-cloud') {
            const newSettings = {
              ...settings,
              sync: { ...settings.sync, enabled: true, provider: 'goyo-cloud' as const },
            };
            onChangeSettings(newSettings);
            void window.writerDesktop.appSettings.save(newSettings);
            void window.writerDesktop.sync.retryNow().catch(() => {});
          }
        }
      });
    });
    return unsubscribe;
  }, [onChangeSettings, settings]);

  const onSendCode = () => {
    if (!email) return;
    setIsSending(true);
    setStatus(null);
    void window.writerDesktop.goyoCloud.authStart(email).then((result) => {
      setIsSending(false);
      setStatus(
        result.ok
          ? 'Login code sent. Check your email.'
          : (result.error ?? 'Could not send login code.'),
      );
    });
  };

  const onVerify = () => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    setStatus(null);
    void window.writerDesktop.goyoCloud.authVerify({ code, email }).then((result) => {
      setIsVerifying(false);
      if (result.ok) {
        setAccount(result.user ?? null);
        setSessionState('signed-in');
        setEmail('');
        setCode('');
        setStatus('Signed in to Goyo Cloud.');
        if (settings.sync.provider !== 'goyo-cloud') {
          const newSettings = {
            ...settings,
            sync: { ...settings.sync, enabled: true, provider: 'goyo-cloud' as const },
          };
          onChangeSettings(newSettings);
          void window.writerDesktop.appSettings.save(newSettings);
          void window.writerDesktop.sync.retryNow().catch(() => {});
        }
        return;
      }
      setStatus(result.error ?? 'Verification failed.');
    });
  };

  const onLogout = () => {
    setIsLoggingOut(true);
    void window.writerDesktop.goyoCloud.logout().then(() => {
      setAccount(null);
      setSessionState('signed-out');
      setIsLoggingOut(false);
      setStatus('Signed out of Goyo Cloud.');
    });
  };

  const onStartBrowser = () => {
    setIsOpeningBrowser(true);
    setStatus(null);
    void window.writerDesktop.goyoCloud.authStartBrowser().then((result) => {
      setIsOpeningBrowser(false);
      if (!result.ok) {
        setStatus('Could not open browser for sign-in.');
        return;
      }
      setStatus('Complete sign-in in your browser to return to the app.');
    });
  };

  if (!loaded) return null as unknown as ReactElement;

  if (account && sessionState !== 'expired') {
    return (
      <SignedInView
        account={account}
        devConfig={devConfig}
        isLoggingOut={isLoggingOut}
        onLogout={onLogout}
        sessionState={sessionState}
        status={status}
      />
    );
  }

  return (
    <SignInView
      code={code}
      devConfig={devConfig}
      email={email}
      isOpeningBrowser={isOpeningBrowser}
      isSending={isSending}
      isVerifying={isVerifying}
      onChangeCode={setCode}
      onChangeEmail={setEmail}
      onSendCode={onSendCode}
      onStartBrowser={onStartBrowser}
      onVerify={onVerify}
      sessionState={sessionState}
      status={status}
    />
  );
}

function SignedInView({
  account,
  devConfig,
  isLoggingOut,
  onLogout,
  sessionState,
  status,
}: {
  account: GoyoCloudAccount;
  devConfig: GoyoCloudDevConfig | null;
  isLoggingOut: boolean;
  onLogout: () => void;
  sessionState: GoyoCloudSessionState;
  status: string | null;
}): ReactElement {
  return (
    <div className="mt-4 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-4">
      <p className="font-medium text-[var(--goyo-text)]">Goyo Cloud account</p>
      <p className="mt-2 text-[var(--goyo-text)] text-sm">{account.email}</p>
      <p className="mt-1 text-[var(--goyo-text-muted)] text-xs">
        {getSessionStateMessage(sessionState)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AppButton disabled={isLoggingOut} onClick={onLogout} size="sm" variant="secondary">
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </AppButton>
        <AppButton
          onClick={() => {
            void window.writerDesktop.goyoCloud.openAccount();
          }}
          size="sm"
          variant="secondary"
        >
          Manage account
        </AppButton>
      </div>
      {status ? <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">{status}</p> : null}
      <GoyoCloudDevInfo config={devConfig} />
    </div>
  );
}

function SignInView({
  code,
  devConfig,
  email,
  isOpeningBrowser,
  isSending,
  isVerifying,
  onChangeCode,
  onChangeEmail,
  onSendCode,
  onStartBrowser,
  onVerify,
  sessionState,
  status,
}: {
  code: string;
  devConfig: GoyoCloudDevConfig | null;
  email: string;
  isOpeningBrowser: boolean;
  isSending: boolean;
  isVerifying: boolean;
  onChangeCode: (code: string) => void;
  onChangeEmail: (email: string) => void;
  onSendCode: () => void;
  onStartBrowser: () => void;
  onVerify: () => void;
  sessionState: GoyoCloudSessionState;
  status: string | null;
}): ReactElement {
  return (
    <div className="mt-4 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-4">
      <p className="font-medium text-[var(--goyo-text)]">Sign in or create an account</p>
      <p className="mt-1 text-[var(--goyo-text-muted)] text-xs">
        Enter your email to sign in. If you are new, a Goyo Cloud account will be created
        automatically after verification.
      </p>
      <p className="mt-2 text-[var(--goyo-text-muted)] text-xs">
        {getSessionStateMessage(sessionState)}
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
        <input
          className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)] px-3 py-2 text-[var(--goyo-text)] text-sm outline-none"
          onChange={(event) => onChangeEmail(event.target.value.trim())}
          placeholder="Email address"
          type="email"
          value={email}
        />
        <AppButton disabled={isSending || !email} onClick={onSendCode} variant="primary">
          {isSending ? 'Sending…' : 'Send code'}
        </AppButton>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
        <input
          className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)] px-3 py-2 text-[var(--goyo-text)] text-sm outline-none"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => {
            const value = event.target.value.replace(/\D/g, '').slice(0, 6);
            onChangeCode(value);
          }}
          placeholder="6-digit code"
          value={code}
        />
        <AppButton disabled={isVerifying || code.length !== 6} onClick={onVerify} variant="primary">
          {isVerifying ? 'Verifying…' : 'Verify code'}
        </AppButton>
      </div>
      <div className="mt-4 flex items-center gap-3 text-[var(--goyo-text-muted)] text-xs">
        <div className="flex-1 border-t border-[var(--goyo-border)]" />
        <span>or</span>
        <div className="flex-1 border-t border-[var(--goyo-border)]" />
      </div>
      <div className="mt-3">
        <AppButton
          className="w-full"
          disabled={isOpeningBrowser}
          onClick={onStartBrowser}
          variant="secondary"
        >
          {isOpeningBrowser ? 'Opening browser…' : 'Sign in with browser'}
        </AppButton>
      </div>
      {status ? <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">{status}</p> : null}
      <GoyoCloudDevInfo config={devConfig} />
    </div>
  );
}

function GoyoCloudDevInfo({ config }: { config: GoyoCloudDevConfig | null }): ReactElement | null {
  if (!config) return null;

  return (
    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[var(--goyo-text-muted)] text-xs">
      <p className="font-medium text-[var(--goyo-text)]">Development Goyo Cloud target</p>
      <dl className="mt-2 grid gap-1">
        <div className="grid gap-1 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
          <dt>API</dt>
          <dd className="break-all font-mono text-[var(--goyo-text)]">{config.apiUrl}</dd>
        </div>
        <div className="grid gap-1 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
          <dt>Web</dt>
          <dd className="break-all font-mono text-[var(--goyo-text)]">{config.webUrl}</dd>
        </div>
        <div className="grid gap-1 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
          <dt>Link</dt>
          <dd className="font-mono text-[var(--goyo-text)]">
            {config.deepLinkProtocolScheme}://{' '}
            {config.deepLinkProtocolRegistered ? 'registered' : 'not registered'}
          </dd>
        </div>
        {config.deepLinkProtocolCommand ? (
          <div className="grid gap-1 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
            <dt>Cmd</dt>
            <dd className="break-all font-mono text-[var(--goyo-text)]">
              {config.deepLinkProtocolCommand.executable}{' '}
              {config.deepLinkProtocolCommand.args.join(' ')}
            </dd>
          </div>
        ) : null}
        <div className="grid gap-1 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
          <dt>Profile</dt>
          <dd className="break-all font-mono text-[var(--goyo-text)]">{config.userDataPath}</dd>
        </div>
      </dl>
      <p className="mt-2">
        If auth looks wrong, make sure the current dev server owns the API port.
      </p>
    </div>
  );
}

function getSessionStateMessage(sessionState: GoyoCloudSessionState): string {
  switch (sessionState) {
    case 'expired':
      return 'Goyo Cloud session expired. Sign in again to resume hosted sync.';
    case 'signed-in':
      return 'Signed in to Goyo Cloud. Sync will use your hosted account.';
    case 'unable-to-connect':
      return 'Unable to connect to Goyo Cloud. Local writing is safe; sync will retry when available.';
    case 'signed-out':
      return 'Goyo Cloud is signed out.';
  }
}

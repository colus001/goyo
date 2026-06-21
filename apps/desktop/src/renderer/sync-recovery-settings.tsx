// biome-ignore lint/nursery/noExcessiveLinesPerFile: Sync settings cards share local state and small presentational helpers.
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { AppSettings } from '../shared/app-settings';
import { AppButton } from './app-button';
import { GoyoCloudAuthSection } from './goyo-cloud-auth-settings';

interface SyncStatusSummary {
  failedItemCount: number;
  needsAttention: boolean;
  oldestFailedAt: string | null;
  pendingItemCount: number;
  recentFailures: SyncFailureSummary[];
}

interface SyncFailureSummary {
  attempts: number;
  documentId: string;
  id: string;
  kind: string;
  lastAttemptAt: string | null;
  lastEndpoint: string | null;
  lastError: string | null;
  lastHttpStatus: number | null;
  recordId: string;
}

type RetrySyncResult = Awaited<ReturnType<typeof window.writerDesktop.sync.retryNow>>;

export function SyncRecoverySettings({
  onChangeSettings,
  settings,
}: {
  onChangeSettings: (settings: AppSettings) => void;
  settings: AppSettings;
}): ReactElement {
  return (
    <div className="space-y-3">
      <SyncProviderSettings onChangeSettings={onChangeSettings} settings={settings} />
      <SyncRecoveryCard />
    </div>
  );
}

function SyncProviderSettings({
  onChangeSettings,
  settings,
}: {
  onChangeSettings: (settings: AppSettings) => void;
  settings: AppSettings;
}): ReactElement {
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [tokenDraft, setTokenDraft] = useState('');
  const hasToken = useHasToken();

  const saveToken = createTokenSaveHandler(setIsSavingToken, setTokenDraft, setConnectionStatus);

  return (
    <div className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/45 p-4">
      <p className="font-medium text-[var(--goyo-text)]">Remote sync</p>
      <p className="mt-1 text-[var(--goyo-text-muted)] text-sm leading-relaxed">
        Choose local-only writing, Goyo Cloud, or your own Cloudflare Worker. Goyo Cloud uses the
        built-in goyo-api.seokjun.kim endpoint; self-hosted sync uses your Worker URL.
      </p>
      <SyncModePicker onChangeSettings={onChangeSettings} settings={settings} />
      {settings.sync.provider === 'self-hosted' ? (
        <SyncConnectionFields
          hasToken={hasToken}
          onChangeSettings={onChangeSettings}
          onChangeTokenDraft={setTokenDraft}
          settings={settings}
          tokenDraft={tokenDraft}
        />
      ) : null}
      <GoyoCloudAuthSection onChangeSettings={onChangeSettings} settings={settings} />
      {settings.sync.provider === 'self-hosted' ? (
        <SyncConnectionActions
          hasToken={hasToken}
          isSavingToken={isSavingToken}
          isTestingConnection={isTestingConnection}
          onClearToken={() => saveToken('')}
          onSaveToken={() => saveToken(tokenDraft)}
          onTestConnection={(isTesting) => setIsTestingConnection(isTesting)}
          setConnectionStatus={setConnectionStatus}
          settings={settings}
          tokenDraft={tokenDraft}
        />
      ) : (
        settings.sync.provider === 'goyo-cloud' &&
        testConnectionButton(isTestingConnection, setIsTestingConnection, setConnectionStatus)
      )}
      {connectionStatus ? (
        <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">{connectionStatus}</p>
      ) : null}
    </div>
  );
}

function useHasToken() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    void window.writerDesktop.syncCredentials.hasToken().then(setHasToken);
  }, []);

  return hasToken;
}

function testConnectionButton(
  isTestingConnection: boolean,
  setIsTestingConnection: (value: boolean) => void,
  setConnectionStatus: (value: string | null) => void,
): ReactElement {
  return (
    <div className="mt-4">
      <AppButton
        disabled={isTestingConnection}
        onClick={() => {
          setIsTestingConnection(true);
          setConnectionStatus(null);
          void window.writerDesktop.sync.testConnection().then((result) => {
            setIsTestingConnection(false);
            setConnectionStatus(
              result.ok ? 'Goyo Cloud connected.' : 'Goyo Cloud did not connect.',
            );
          });
        }}
        variant="primary"
      >
        {isTestingConnection ? 'Testing…' : 'Test connection'}
      </AppButton>
    </div>
  );
}

function createTokenSaveHandler(
  setIsSavingToken: (value: boolean) => void,
  setTokenDraft: (value: string) => void,
  setConnectionStatus: (value: string | null) => void,
) {
  return (token: string) => {
    setIsSavingToken(true);
    setConnectionStatus(null);
    void window.writerDesktop.syncCredentials
      .saveToken(token)
      .then(() => {
        setTokenDraft('');
        setConnectionStatus(token ? 'Sync token saved.' : 'Sync token cleared.');
      })
      .catch(() => setConnectionStatus('Sync token could not be saved.'))
      .finally(() => setIsSavingToken(false));
  };
}

function SyncModePicker({
  onChangeSettings,
  settings,
}: {
  onChangeSettings: (settings: AppSettings) => void;
  settings: AppSettings;
}): ReactElement {
  return (
    <div className="mt-4 grid gap-2 md:grid-cols-3">
      <SyncModeOption
        description="Keep every draft on this device unless you export or back it up."
        isSelected={settings.sync.provider === 'local'}
        label="Local only"
        onSelect={() =>
          onChangeSettings({
            ...settings,
            sync: { ...settings.sync, enabled: false, provider: 'local' },
          })
        }
      />
      <SyncModeOption
        description="Use the official goyo-api.seokjun.kim endpoint when hosted accounts are available."
        isSelected={settings.sync.provider === 'goyo-cloud'}
        label="Goyo Cloud"
        onSelect={() =>
          onChangeSettings({
            ...settings,
            sync: { ...settings.sync, enabled: true, provider: 'goyo-cloud' },
          })
        }
      />
      <SyncModeOption
        description="Connect to a Cloudflare Worker you deploy and control."
        isSelected={settings.sync.provider === 'self-hosted'}
        label="Self-hosted Worker"
        onSelect={() =>
          onChangeSettings({
            ...settings,
            sync: { ...settings.sync, enabled: true, provider: 'self-hosted' },
          })
        }
      />
    </div>
  );
}

function SyncModeOption({
  description,
  isSelected,
  label,
  onSelect,
}: {
  description: string;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}): ReactElement {
  return (
    <button
      className={`rounded-xl border p-3 text-left outline-none transition ${
        isSelected
          ? 'border-[var(--goyo-accent)] bg-[var(--goyo-accent-soft)]'
          : 'border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 hover:bg-[var(--goyo-raised)]'
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="block font-medium text-[var(--goyo-text)] text-sm">{label}</span>
      <span className="mt-1 block text-[var(--goyo-text-muted)] text-xs leading-relaxed">
        {description}
      </span>
    </button>
  );
}

function SyncConnectionFields({
  hasToken,
  onChangeSettings,
  onChangeTokenDraft,
  settings,
  tokenDraft,
}: {
  hasToken: boolean;
  onChangeSettings: (settings: AppSettings) => void;
  onChangeTokenDraft: (token: string) => void;
  settings: AppSettings;
  tokenDraft: string;
}): ReactElement {
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <SettingsInput
        label="Worker URL"
        onChange={(serverUrl) =>
          onChangeSettings({ ...settings, sync: { ...settings.sync, selfHostedUrl: serverUrl } })
        }
        placeholder="https://your-worker.example.workers.dev"
        type="url"
        value={settings.sync.selfHostedUrl}
      />
      <SettingsInput
        label={`Bearer token ${hasToken ? '(saved)' : ''}`}
        onChange={onChangeTokenDraft}
        placeholder={hasToken ? 'New token' : 'Worker sync token'}
        type="password"
        value={tokenDraft}
      />
    </div>
  );
}

function SyncConnectionActions({
  hasToken,
  isSavingToken,
  isTestingConnection,
  onClearToken,
  onSaveToken,
  onTestConnection,
  setConnectionStatus,
  settings,
  tokenDraft,
}: {
  hasToken: boolean;
  isSavingToken: boolean;
  isTestingConnection: boolean;
  onClearToken: () => void;
  onSaveToken: () => void;
  onTestConnection: (isTesting: boolean) => void;
  setConnectionStatus: (status: string | null) => void;
  settings: AppSettings;
  tokenDraft: string;
}): ReactElement {
  const testConnection = () => {
    onTestConnection(true);
    setConnectionStatus(null);
    void window.writerDesktop.sync
      .testConnection()
      .then((result) => {
        setConnectionStatus(result.ok ? 'Sync server connected.' : 'Sync server did not connect.');
      })
      .catch(() => setConnectionStatus('Sync server did not connect.'))
      .finally(() => onTestConnection(false));
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <SettingsButton
        disabled={isSavingToken || tokenDraft.trim().length === 0}
        onClick={onSaveToken}
      >
        {isSavingToken ? 'Saving...' : 'Save token'}
      </SettingsButton>
      <SettingsButton disabled={isSavingToken || !hasToken} onClick={onClearToken}>
        Clear token
      </SettingsButton>
      <SettingsButton
        disabled={
          isTestingConnection || !settings.sync.enabled || settings.sync.provider === 'local'
        }
        isPrimary
        onClick={testConnection}
      >
        {isTestingConnection ? 'Testing...' : 'Test connection'}
      </SettingsButton>
    </div>
  );
}

function SyncRecoveryCard(): ReactElement {
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncStatusSummary | null>(null);
  const [retryResult, setRetryResult] = useState<RetrySyncResult | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);

  const refreshSummary = () => {
    void window.writerDesktop.sync.getStatusSummary().then(setSummary);
  };

  useEffect(refreshSummary, []);

  return (
    <div className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/45 p-4">
      <SyncRecoveryHeader onRefresh={refreshSummary} />
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <SyncMetric label="Pending items" value={summary?.pendingItemCount ?? 0} />
        <SyncMetric label="Failed attempts" value={summary?.failedItemCount ?? 0} />
        <SyncMetric label="Status" value={summary?.needsAttention ? 'Needs attention' : 'Ready'} />
      </div>
      {summary?.oldestFailedAt ? (
        <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">
          Oldest failed sync attempt: {formatSyncDate(summary.oldestFailedAt)}
        </p>
      ) : null}
      <SyncRetryResult result={retryResult} />
      <SyncFailureList failures={summary?.recentFailures ?? []} />
      <SyncRecoveryActions
        isExportingBackup={isExportingBackup}
        isRetrying={isRetrying}
        setDebugStatus={setDebugStatus}
        setBackupStatus={setBackupStatus}
        setIsExportingBackup={setIsExportingBackup}
        setIsRetrying={setIsRetrying}
        setRetryResult={setRetryResult}
        setSummary={setSummary}
        summary={summary}
      />
      {backupStatus ? (
        <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">{backupStatus}</p>
      ) : null}
      {debugStatus ? (
        <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">{debugStatus}</p>
      ) : null}
    </div>
  );
}

function SyncRecoveryHeader({ onRefresh }: { onRefresh: () => void }): ReactElement {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium text-[var(--goyo-text)]">Sync recovery</p>
        <p className="mt-1 text-[var(--goyo-text-muted)] text-sm leading-relaxed">
          Local writing stays safe even when remote sync needs attention. Retry remote sync here;
          local checkpoints and restore points remain available in Recovery.
        </p>
      </div>
      <AppButton onClick={onRefresh} size="sm" variant="secondary">
        Refresh
      </AppButton>
    </div>
  );
}

function SyncRecoveryActions({
  isExportingBackup,
  isRetrying,
  setDebugStatus,
  setBackupStatus,
  setIsExportingBackup,
  setIsRetrying,
  setRetryResult,
  setSummary,
  summary,
}: {
  isExportingBackup: boolean;
  isRetrying: boolean;
  setDebugStatus: (status: string | null) => void;
  setBackupStatus: (status: string | null) => void;
  setIsExportingBackup: (isExporting: boolean) => void;
  setIsRetrying: (isRetrying: boolean) => void;
  setRetryResult: (result: RetrySyncResult | null) => void;
  setSummary: (summary: SyncStatusSummary | null) => void;
  summary: SyncStatusSummary | null;
}): ReactElement {
  const retryNow = () => {
    setIsRetrying(true);
    setRetryResult(null);
    void window.writerDesktop.sync
      .retryNow()
      .then((result) => {
        setRetryResult(result);
      })
      .then(() => window.writerDesktop.sync.getStatusSummary())
      .then(setSummary)
      .finally(() => setIsRetrying(false));
  };
  const copyDebugReport = () => {
    setDebugStatus(null);
    void navigator.clipboard
      .writeText(createSyncDebugReport(summary))
      .then(() => setDebugStatus('Sync debug report copied.'))
      .catch(() => setDebugStatus('Could not copy sync debug report.'));
  };
  const exportBackup = () => {
    setIsExportingBackup(true);
    setBackupStatus(null);
    void window.writerDesktop.backup
      .exportLocalData()
      .then((result) => {
        setBackupStatus(result.exported ? 'Backup exported.' : 'Backup export cancelled.');
      })
      .catch(() => setBackupStatus('Backup export failed.'))
      .finally(() => setIsExportingBackup(false));
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <SettingsButton disabled={isRetrying} isPrimary onClick={retryNow}>
        {isRetrying ? 'Retrying...' : 'Retry sync now'}
      </SettingsButton>
      <SettingsButton disabled={isExportingBackup} onClick={exportBackup}>
        {isExportingBackup ? 'Exporting...' : 'Export local backup'}
      </SettingsButton>
      <SettingsButton disabled={!summary} onClick={copyDebugReport}>
        Copy debug report
      </SettingsButton>
    </div>
  );
}

function SyncRetryResult({ result }: { result: RetrySyncResult | null }): ReactElement | null {
  if (!result) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-3 text-[var(--goyo-text-muted)] text-xs">
      <p className="font-medium text-[var(--goyo-text)]">Last retry result</p>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        <p>Updates pushed: {result.updatePush.pushedUpdateCount}</p>
        <p>Updates skipped: {result.updatePush.skippedUpdateCount}</p>
        <p>Snapshots pushed: {result.snapshotPush.pushedSnapshotCount}</p>
        <p>Snapshots skipped: {result.snapshotPush.skippedSnapshotCount}</p>
        <p>Updates pulled: {result.updatePull.pulledUpdateCount}</p>
        <p>Documents skipped on pull: {result.updatePull.skippedDocumentCount}</p>
        <p>Snapshots pulled: {result.snapshotPull.pulledSnapshotCount}</p>
        <p>Documents skipped on snapshot pull: {result.snapshotPull.skippedDocumentCount}</p>
      </div>
    </div>
  );
}

function SyncFailureList({ failures }: { failures: SyncFailureSummary[] }): ReactElement | null {
  if (failures.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-3">
      <p className="font-medium text-[var(--goyo-text)] text-sm">Recent failures</p>
      <div className="mt-2 space-y-2">
        {failures.map((failure) => (
          <SyncFailureRow failure={failure} key={failure.id} />
        ))}
      </div>
    </div>
  );
}

function SyncFailureRow({ failure }: { failure: SyncFailureSummary }): ReactElement {
  return (
    <div className="rounded-lg border border-[var(--goyo-border)] bg-[var(--goyo-raised)] p-2 text-xs">
      <p className="font-medium text-[var(--goyo-text)]">
        {failure.kind} · {failure.lastHttpStatus ?? 'no HTTP status'} · {failure.attempts} attempts
      </p>
      <p className="mt-1 break-all text-[var(--goyo-text-muted)]">
        document {failure.documentId} · record {failure.recordId}
      </p>
      {failure.lastEndpoint ? (
        <p className="mt-1 break-all text-[var(--goyo-text-muted)]">{failure.lastEndpoint}</p>
      ) : null}
      {failure.lastError ? (
        <p className="mt-1 text-[var(--goyo-text-muted)]">{failure.lastError}</p>
      ) : null}
      {failure.lastAttemptAt ? (
        <p className="mt-1 text-[var(--goyo-text-faint)]">
          Last attempt: {formatSyncDate(failure.lastAttemptAt)}
        </p>
      ) : null}
    </div>
  );
}

function createSyncDebugReport(summary: SyncStatusSummary | null): string {
  if (!summary) {
    return 'No sync summary loaded.';
  }

  return JSON.stringify(
    {
      failedItemCount: summary.failedItemCount,
      needsAttention: summary.needsAttention,
      oldestFailedAt: summary.oldestFailedAt,
      pendingItemCount: summary.pendingItemCount,
      recentFailures: summary.recentFailures,
    },
    null,
    2,
  );
}

function SettingsInput({
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: 'password' | 'url';
  value: string;
}): ReactElement {
  return (
    <label className="block">
      <span className="font-semibold text-[var(--goyo-text-faint)] text-[0.68rem] uppercase tracking-[0.14em]">
        {label}
      </span>
      <input
        className="mt-1 w-full rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] px-3 py-2 text-[var(--goyo-text)] text-sm outline-none focus:border-[var(--goyo-accent)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function SettingsButton({
  children,
  disabled,
  isPrimary = false,
  onClick,
}: {
  children: string;
  disabled: boolean;
  isPrimary?: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <AppButton disabled={disabled} onClick={onClick} variant={isPrimary ? 'primary' : 'secondary'}>
      {children}
    </AppButton>
  );
}

function SyncMetric({ label, value }: { label: string; value: number | string }): ReactElement {
  return (
    <div className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)] p-3">
      <p className="font-semibold text-[var(--goyo-text-faint)] text-[0.68rem] uppercase tracking-[0.14em]">
        {label}
      </p>
      <p className="mt-1 font-medium text-[var(--goyo-text)]">{value}</p>
    </div>
  );
}

function formatSyncDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

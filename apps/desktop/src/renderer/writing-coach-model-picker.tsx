import { Check, ChevronDown, Search, Settings } from 'lucide-react';
import { useId, useState } from 'react';
import { COACH_PROVIDER_NAMES, type CoachProviderAccount } from '../shared/writing-coach';
import { AppButton } from './app-button';
import { useCoachPopover } from './use-coach-popover';
import type { useCoachModels } from './writing-coach-models';

type ModelState = ReturnType<typeof useCoachModels>;

export function WritingCoachModelPicker({
  state,
  onOpenSettings,
  disabled,
}: {
  state: ModelState;
  onOpenSettings: () => void;
  disabled: boolean;
}) {
  const { account, accounts, selected } = state;
  const popover = useCoachPopover();
  const id = useId();
  const provider = account ? COACH_PROVIDER_NAMES[account.providerID] : '';
  return (
    <div className="relative min-w-0" ref={popover.container}>
      <button
        aria-controls={popover.open ? id : undefined}
        aria-expanded={popover.open}
        className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-md px-2 text-[var(--goyo-text-muted)] text-xs transition hover:bg-[var(--goyo-accent-soft)] aria-expanded:bg-[var(--goyo-accent-soft)] disabled:opacity-50"
        disabled={disabled}
        onClick={() => popover.setOpen(!popover.open)}
        ref={popover.trigger}
        title={selected ? `${provider} / ${selected.name}` : 'Choose an AI model'}
        type="button"
      >
        <span className="truncate">
          {selected?.name ?? (accounts.length ? 'Choose model' : 'Connect AI')}
        </span>
        <ChevronDown aria-hidden="true" className="shrink-0" size={13} />
      </button>
      {popover.open && (
        <fieldset
          aria-label="AI model picker"
          className="absolute bottom-full left-0 z-20 mb-2 w-61 max-w-[calc(100vw-4rem)] overflow-hidden rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] text-sm shadow-md"
          id={id}
        >
          <PickerContents
            onOpenSettings={onOpenSettings}
            onSelect={() => {
              popover.setOpen(false);
              popover.trigger.current?.focus();
            }}
            state={state}
          />
        </fieldset>
      )}
    </div>
  );
}

function PickerContents({
  state,
  onSelect,
  onOpenSettings,
}: {
  state: ModelState;
  onSelect: () => void;
  onOpenSettings: () => void;
}) {
  const { account, accounts, loading, message, refresh, selectAccount } = state;
  return (
    <>
      <div className="space-y-2 p-2">
        {accounts.length > 0 && (
          <select
            aria-label="AI account"
            className="w-full truncate rounded-md border border-[var(--goyo-border)] bg-[var(--goyo-paper)] px-2 py-1.5 text-xs"
            onChange={(event) => selectAccount(event.target.value)}
            value={account?.id ?? ''}
          >
            <option disabled value="">
              Choose an account
            </option>
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {accountLabel(item, accounts)}
              </option>
            ))}
          </select>
        )}
        {account && <ModelOptions key={account.id} onSelect={onSelect} state={state} />}
        {(!account || message || loading) && (
          <p aria-live="polite" className="px-1 py-1 text-[var(--goyo-text-muted)] text-xs">
            {message ||
              (loading
                ? 'Loading models…'
                : accounts.length
                  ? 'Choose an account to see its models.'
                  : 'Connect a provider in AI settings.')}
          </p>
        )}
        {account?.providerID === 'chatgpt' && (
          <p className="px-1 text-[var(--goyo-text-muted)] text-xs">Using ChatGPT plan</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-1 border-[var(--goyo-border)] border-t px-1 py-1">
        <AppButton onClick={onOpenSettings} size="sm" variant="ghost">
          <Settings aria-hidden="true" size={13} />
          AI settings
        </AppButton>
        {account && (
          <AppButton disabled={loading} onClick={refresh} size="sm" variant="ghost">
            Refresh
          </AppButton>
        )}
      </div>
    </>
  );
}

function accountLabel(account: CoachProviderAccount, accounts: CoachProviderAccount[]) {
  const provider = COACH_PROVIDER_NAMES[account.providerID];
  const duplicate = accounts.some(
    (item) =>
      item.id !== account.id &&
      item.providerID === account.providerID &&
      item.label === account.label,
  );
  const label = account.label === provider ? provider : `${provider} · ${account.label}`;
  return duplicate ? `${label} · ${account.id.slice(0, 6)}` : label;
}

function ModelOptions({ state, onSelect }: { state: ModelState; onSelect: () => void }) {
  const [search, setSearch] = useState('');
  const { options, selected, setModelId } = state;
  const query = search.trim().toLowerCase();
  const matches = options.filter(({ id, name }) => `${name} ${id}`.toLowerCase().includes(query));
  if (!options.length) return null;
  return (
    <>
      <div className="flex items-center gap-2 rounded-md bg-[var(--goyo-app)] px-2 py-1.5 text-[var(--goyo-text-muted)]">
        <Search aria-hidden="true" size={13} />
        <input
          aria-label="Find a model"
          className="min-w-0 flex-1 text-[var(--goyo-text)] text-xs"
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229)
              event.preventDefault();
          }}
          placeholder="Find a model…"
          type="search"
          value={search}
        />
      </div>
      <ul aria-label="Available models" className="max-h-44 overflow-y-auto">
        {matches.map(({ id, name }) => (
          <li key={id}>
            <button
              aria-pressed={selected?.id === id}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--goyo-accent-soft)] aria-pressed:bg-[var(--goyo-accent-soft)]"
              onClick={() => {
                setModelId(id);
                onSelect();
              }}
              title={name}
              type="button"
            >
              <span className="truncate">{name}</span>
              {selected?.id === id && <Check aria-hidden="true" className="shrink-0" size={13} />}
            </button>
          </li>
        ))}
        {!matches.length && (
          <li className="px-2 py-1.5 text-[var(--goyo-text-muted)] text-xs">No matching models.</li>
        )}
      </ul>
    </>
  );
}

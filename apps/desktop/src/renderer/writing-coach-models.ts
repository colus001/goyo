import { useEffect, useState } from 'react';
import type { CoachModel, CoachProviderAccount } from '../shared/writing-coach';

const LAST_MODEL = 'goyo:writing-coach-model';

function restoreSelection(): { accountId: string; modelId: string } {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_MODEL) ?? 'null');
    if (typeof value?.accountId === 'string' && typeof value.modelId === 'string') return value;
  } catch {
    // The picker still works if local UI storage is unavailable.
  }
  return { accountId: '', modelId: '' };
}

export function useCoachModels(open: boolean) {
  const { accounts, accountError } = useConnectedCoachAccounts(open);
  const [initial] = useState(restoreSelection);
  const [selection, setSelection] = useState({ accountId: initial.accountId });
  const [modelId, setModelId] = useState(initial.modelId);
  const account = selection.accountId
    ? accounts.find((item) => item.id === selection.accountId)
    : accounts.length === 1
      ? accounts[0]
      : undefined;
  const { models, loading, message } = useAccountModels(open, account?.id, selection);
  return {
    accounts,
    account,
    options: models,
    loading,
    message: accountError || message,
    selected: models.find((item) => item.id === modelId),
    setModelId(id: string) {
      if (!account) return;
      setModelId(id);
      try {
        localStorage.setItem(LAST_MODEL, JSON.stringify({ accountId: account.id, modelId: id }));
      } catch {
        // Selection remains usable without persistence.
      }
    },
    selectAccount(id: string) {
      setModelId('');
      setSelection({ accountId: id });
    },
    refresh: () => setSelection({ accountId: account?.id ?? '' }),
  };
}

function useConnectedCoachAccounts(open: boolean) {
  const [accounts, setAccounts] = useState<CoachProviderAccount[]>([]);
  const [accountError, setAccountError] = useState('');
  useEffect(() => {
    if (!open) return;
    let active = true;
    setAccountError('');
    void window.writerDesktop.writingCoach
      .listAccounts()
      .then((result) => {
        if (!active) return;
        if (!result.ok) throw new Error(result.error);
        setAccounts(result.data.filter((item) => item.signedIn));
      })
      .catch(() => {
        if (!active) return;
        setAccounts([]);
        setAccountError('Could not load AI accounts from Settings.');
      });
    return () => {
      active = false;
    };
  }, [open]);
  return { accounts, accountError };
}

function useAccountModels(open: boolean, accountId: string | undefined, selection: object) {
  const [result, setResult] = useState<{
    accountId: string;
    selection: object;
    models: CoachModel[];
    message: string;
  }>();
  useEffect(() => {
    if (!open || !accountId) return;
    let active = true;
    void window.writerDesktop.writingCoach
      .listModels(accountId)
      .then((response) => {
        if (!active) return;
        setResult({
          accountId,
          selection,
          models: response.ok ? response.data : [],
          message: response.ok
            ? response.data.length
              ? ''
              : 'No chat models are available.'
            : response.error,
        });
      })
      .catch(() => {
        if (active)
          setResult({
            accountId,
            selection,
            models: [],
            message: 'Could not load models for this account.',
          });
      });
    return () => {
      active = false;
    };
  }, [accountId, open, selection]);
  return result && result.accountId === accountId && result.selection === selection
    ? { models: result.models, message: result.message, loading: false }
    : { models: [], message: '', loading: !!accountId };
}

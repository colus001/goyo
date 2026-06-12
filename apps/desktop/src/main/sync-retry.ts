import type { SyncQueueItem } from '@writer/core';

const INITIAL_SYNC_RETRY_DELAY_MS = 30_000;
const MAX_SYNC_RETRY_DELAY_MS = 60 * 60 * 1000;

export function isSyncItemReadyForRetry(item: SyncQueueItem, now: Date) {
  if (item.attempts === 0 || !item.lastAttemptAt) {
    return true;
  }

  const lastAttemptTime = Date.parse(item.lastAttemptAt);

  if (Number.isNaN(lastAttemptTime)) {
    return true;
  }

  return now.getTime() - lastAttemptTime >= getSyncRetryDelayMs(item.attempts);
}

function getSyncRetryDelayMs(attempts: number) {
  return Math.min(INITIAL_SYNC_RETRY_DELAY_MS * 2 ** (attempts - 1), MAX_SYNC_RETRY_DELAY_MS);
}

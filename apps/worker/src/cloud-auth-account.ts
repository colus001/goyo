import type { AuthAccountStatus } from '@writer/shared';

export function getDefaultAccountStatus(): AuthAccountStatus {
  return { billing: { status: 'deferred' }, sync: { available: true, enforcement: 'disabled' } };
}

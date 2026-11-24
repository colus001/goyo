import { CoachError } from './writing-coach-oauth';

export async function requestProviderJson(
  url: string,
  headers: Record<string, string>,
  provider: string,
  body?: object,
) {
  const response = await fetch(url, {
    headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(body ? 90_000 : 10_000),
  });
  if (response.status === 401) throw new CoachError(`${provider} rejected the API key.`);
  if (response.status === 403)
    throw new CoachError(
      `${provider} denied access. Check your subscription or account permissions.`,
    );
  if (response.status === 402 || response.status === 429)
    throw new CoachError(`${provider} usage limit reached. Check your plan or balance.`);
  if (!response.ok) throw new CoachError(`${provider} could not complete the request.`);
  return response.json() as Promise<unknown>;
}

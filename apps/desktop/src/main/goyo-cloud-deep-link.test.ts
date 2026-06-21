import { describe, expect, it } from 'vitest';
import { parseGoyoCloudDeepLinkCallback } from './goyo-cloud-deep-link';

describe('Goyo Cloud deep links', () => {
  it('parses the browser callback URL shape', () => {
    expect(
      parseGoyoCloudDeepLinkCallback(
        'goyo://auth/callback?token=session-token&email=writer%40example.com&userId=user_1',
      ),
    ).toEqual({
      email: 'writer@example.com',
      token: 'session-token',
      userId: 'user_1',
    });
  });

  it('parses the absolute path callback URL shape', () => {
    expect(
      parseGoyoCloudDeepLinkCallback(
        'goyo:///auth/callback?token=session-token&email=writer%40example.com&userId=user_1',
      ),
    ).toEqual({
      email: 'writer@example.com',
      token: 'session-token',
      userId: 'user_1',
    });
  });

  it('parses the development callback scheme', () => {
    expect(
      parseGoyoCloudDeepLinkCallback(
        'goyo-dev://auth/callback?token=session-token&email=writer%40example.com&userId=user_1',
      ),
    ).toEqual({
      email: 'writer@example.com',
      token: 'session-token',
      userId: 'user_1',
    });
  });

  it('rejects unrelated or tokenless deep links', () => {
    expect(parseGoyoCloudDeepLinkCallback('goyo://auth/callback')).toBeNull();
    expect(parseGoyoCloudDeepLinkCallback('goyo://documents/open?token=session-token')).toBeNull();
    expect(
      parseGoyoCloudDeepLinkCallback('https://goyo-cloud.seokjun.kim/auth/callback'),
    ).toBeNull();
  });
});

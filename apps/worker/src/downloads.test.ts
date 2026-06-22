import { describe, expect, it } from 'vitest';
import worker from './index';

describe('release downloads', () => {
  it('serves release file headers for HEAD requests', () => expectReleaseHeadRequestServed());
});

async function expectReleaseHeadRequestServed() {
  const response = await worker.fetch(
    new Request('https://api.example.com/releases/Goyo-0.1.11-mac-arm64.zip', {
      method: 'HEAD',
    }),
    { RELEASES: createReleaseBucket('Goyo-0.1.11-mac-arm64.zip', 'zip-content') } as never,
    {} as never,
  );

  expect(response.status).toBe(200);
  expect(response.headers.get('content-disposition')).toBe(
    'attachment; filename="Goyo-0.1.11-mac-arm64.zip"',
  );
  expect(await response.text()).toBe('');
}

function createReleaseBucket(filename: string, contents: string): R2Bucket {
  return {
    get: async (key: string) => {
      if (key !== `releases/${filename}`) {
        return null;
      }

      return {
        body: new Blob([contents]).stream(),
        httpMetadata: { contentType: 'application/zip' },
      } as R2Object;
    },
  } as R2Bucket;
}

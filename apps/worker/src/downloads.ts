const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/colus001/goyo/releases/latest';
const RELEASE_CACHE_SECONDS = 300;
const REDIRECT_CACHE_SECONDS = 300;
const YML_CACHE_SECONDS = 600;

const downloadTargets = {
  'linux-appimage': {
    label: 'Linux AppImage',
    pattern: /^Goyo-.*-linux-x86_64\.AppImage$/,
  },
  'linux-deb': {
    label: 'Linux deb',
    pattern: /^Goyo-.*-linux-amd64\.deb$/,
  },
  mac: {
    label: 'macOS',
    pattern: /^Goyo-.*-mac-arm64\.dmg$/,
  },
  windows: {
    label: 'Windows',
    pattern: /^Goyo-.*-win-x64\.exe$/,
  },
} as const;

type DownloadTarget = keyof typeof downloadTargets;

interface GitHubReleaseAsset {
  browser_download_url: string;
  name: string;
}

interface GitHubRelease {
  assets: GitHubReleaseAsset[];
  html_url: string;
  tag_name: string;
}

const R2_KEY_PREFIX = 'releases';

const R2_FILE_NAMES: Record<DownloadTarget, string> = {
  'linux-appimage': 'Goyo.AppImage',
  'linux-deb': 'Goyo.deb',
  mac: 'Goyo.dmg',
  windows: 'Goyo-Setup.exe',
};

export function matchDownloadRoute(pathname: string): DownloadTarget | null {
  const match = /^\/downloads\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  const target = match[1];

  return isDownloadTarget(target) ? target : null;
}

export function matchReleaseRoute(pathname: string): string | null {
  const match = /^\/releases\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  const filename = match[1];

  if (filename.length === 0 || filename.includes('..')) {
    return null;
  }

  return filename;
}

export async function serveReleaseFile(
  filename: string,
  releasesBucket: R2Bucket | undefined,
): Promise<Response> {
  const fromR2 = await tryServeReleaseFromR2(filename, releasesBucket);

  if (fromR2) {
    return fromR2;
  }

  const assetUrl = await findAssetUrlByName(filename);

  if (assetUrl) {
    return new Response(null, {
      headers: {
        'Cache-Control': `public, max-age=${REDIRECT_CACHE_SECONDS}, s-maxage=${REDIRECT_CACHE_SECONDS}`,
        Location: assetUrl,
      },
      status: 302,
    });
  }

  return new Response(null, { status: 404 });
}

async function tryServeReleaseFromR2(
  filename: string,
  releasesBucket: R2Bucket | undefined,
): Promise<Response | null> {
  if (!releasesBucket) {
    return null;
  }

  const r2Key = `${R2_KEY_PREFIX}/${filename}`;
  const r2Object = await releasesBucket.get(r2Key);

  if (!r2Object) {
    return null;
  }

  const isYml = filename.endsWith('.yml');
  const contentType =
    r2Object.httpMetadata?.contentType ?? (isYml ? 'text/yaml' : 'application/octet-stream');
  const cacheSeconds = isYml ? YML_CACHE_SECONDS : REDIRECT_CACHE_SECONDS;

  const headers: Record<string, string> = {
    'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    'Content-Type': contentType,
  };

  if (!isYml) {
    headers['Content-Disposition'] = `attachment; filename="${filename}"`;
  }

  return new Response(r2Object.body, {
    headers,
    status: 200,
  });
}

export async function serveDownload(
  target: DownloadTarget,
  releasesBucket: R2Bucket | undefined,
): Promise<Response> {
  if (releasesBucket) {
    const r2Key = `${R2_KEY_PREFIX}/${R2_FILE_NAMES[target]}`;
    const r2Object = await releasesBucket.get(r2Key);

    if (r2Object) {
      return new Response(r2Object.body, {
        headers: {
          'Cache-Control': `public, max-age=${REDIRECT_CACHE_SECONDS}, s-maxage=${REDIRECT_CACHE_SECONDS}`,
          'Content-Disposition': `attachment; filename="${R2_FILE_NAMES[target]}"`,
          'Content-Type': r2Object.httpMetadata?.contentType ?? 'application/octet-stream',
        },
        status: 200,
      });
    }
  }

  return redirectToLatestRelease(target);
}

async function redirectToLatestRelease(target: DownloadTarget): Promise<Response> {
  const release = await fetchLatestRelease();
  const downloadTarget = downloadTargets[target];
  const asset = release.assets.find((candidate) => downloadTarget.pattern.test(candidate.name));

  if (!asset) {
    return Response.json(
      {
        error: `No ${downloadTarget.label} download found in latest release`,
        release: release.html_url,
        tag: release.tag_name,
      },
      { status: 404 },
    );
  }

  return new Response(null, {
    headers: {
      'Cache-Control': `public, max-age=${REDIRECT_CACHE_SECONDS}, s-maxage=${REDIRECT_CACHE_SECONDS}`,
      Location: asset.browser_download_url,
    },
    status: 302,
  });
}

function isDownloadTarget(value: string): value is DownloadTarget {
  return value in downloadTargets;
}

async function findAssetUrlByName(filename: string): Promise<string | null> {
  try {
    const release = await fetchLatestRelease();
    const asset = release.assets.find((candidate) => candidate.name === filename);

    return asset?.browser_download_url ?? null;
  } catch {
    return null;
  }
}

async function fetchLatestRelease(): Promise<GitHubRelease> {
  const cache = caches.default;
  const cacheKey = new Request(GITHUB_LATEST_RELEASE_URL);
  const cached = await cache.match(cacheKey);

  if (cached) {
    return (await cached.json()) as GitHubRelease;
  }

  const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'goyo-download-redirect',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub latest release request failed with ${response.status}`);
  }

  const cacheable = new Response(response.body, response);
  cacheable.headers.set(
    'Cache-Control',
    `public, max-age=${RELEASE_CACHE_SECONDS}, s-maxage=${RELEASE_CACHE_SECONDS}`,
  );
  await cache.put(cacheKey, cacheable.clone());

  return (await cacheable.json()) as GitHubRelease;
}

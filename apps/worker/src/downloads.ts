const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/colus001/goyo/releases/latest';
const RELEASE_CACHE_SECONDS = 300;
const REDIRECT_CACHE_SECONDS = 300;

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

export function matchDownloadRoute(pathname: string): DownloadTarget | null {
  const match = /^\/downloads\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  const target = match[1];

  return isDownloadTarget(target) ? target : null;
}

export async function redirectToLatestDownload(target: DownloadTarget): Promise<Response> {
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

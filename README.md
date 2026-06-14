# Goyo

Goyo is a calm, long-form writing app for essays and fiction. The first target
is an Electron desktop app, with shared packages kept portable enough for a
future browser app.

## Status

This project is in early preview. The desktop app, sync API, release automation,
and landing site are still changing quickly.

Important limitations:

- Do not rely on the hosted sync API for production writing yet.
- The Worker sync API currently supports self-hosted, single-user bearer-token
  auth. Hosted multi-user accounts are not implemented yet.
- Desktop release artifacts are currently unsigned.
- Preserve your own backups while testing.

## Workspace

This repository uses pnpm and Turborepo.

- `apps/desktop`: Electron desktop app.
- `apps/landing`: Public landing site.
- `apps/worker`: Cloudflare Worker sync API.
- `packages/core`: Platform-agnostic writing, sync, recovery, and domain logic.
- `packages/editor`: Shared editor integration.
- `packages/shared`: Shared types and cross-runtime constants.
- `packages/ui`: Reusable UI components.

## Development

Install dependencies:

```sh
pnpm install
```

Run all dev tasks through Turbo:

```sh
pnpm dev
```

Run one target:

```sh
pnpm dev:desktop
pnpm dev:landing
pnpm dev:worker
```

Validate the workspace:

```sh
pnpm check
```

Build all packages and apps:

```sh
pnpm build
```

## Releases

Desktop release automation is configured through GitHub Actions. Tagged releases
use `apps/desktop/package.json` as the desktop version source of truth.

## Self-Hosted Sync

Goyo can connect the desktop app to a Cloudflare Worker that you deploy in your
own Cloudflare account. The app build does not need to be customized; configure
the sync URL and token in Settings.

1. Create a Cloudflare D1 database.
2. Update `apps/worker/wrangler.jsonc` with your D1 database binding.
3. Apply the Worker migrations with Wrangler.
4. Set a private sync token with `wrangler secret put GOYO_SYNC_TOKEN`.
5. Deploy the Worker with `pnpm --filter @writer/worker deploy`.
6. In the desktop app, open Settings -> Sync & Account, enable remote sync, enter
   your Worker URL, save the bearer token, and test the connection.

## Security

See [SECURITY.md](SECURITY.md). The current Worker API is not production-ready
and should not receive sensitive writing content until authentication and
ownership checks are implemented.

## License

MIT

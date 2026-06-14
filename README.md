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
- `apps/landing`: Public marketing site, downloads, and product information.
- `apps/web`: Goyo Cloud product web app for login, account status, and future billing.
- `apps/worker`: Cloudflare Worker sync, auth, and future billing API.
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
pnpm dev:web
pnpm dev:worker
```

## Apps And Deployment

The public landing site and the Goyo Cloud product web app are intentionally
separate. Keep account, login, billing, and authenticated cloud state out of
`apps/landing`; those features belong in `apps/web` and `apps/worker`.

- Landing site: `apps/landing`, deployed with Wrangler to `goyo.seokjun.kim`.
- Goyo Cloud web: `apps/web`, deployed with Wrangler to
  `goyo-cloud.seokjun.kim`.
- Sync and auth API: `apps/worker`, deployed to `goyo-api.seokjun.kim`.

Goyo Cloud signup is planned to be open. Payment and sync entitlement enforcement
are deferred until the account and hosted sync foundation is working.

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

Goyo can run local-only, connect to Goyo Cloud, or connect to a Cloudflare Worker
that you deploy in your own Cloudflare account. The app build does not need to be
customized; choose the sync mode, URL, and token in Settings.

1. Create a Cloudflare D1 database.
2. Update `apps/worker/wrangler.jsonc` with your D1 database binding.
3. Apply the Worker migrations with Wrangler.
4. Set a private sync token with `wrangler secret put GOYO_SYNC_TOKEN`.
5. Deploy the Worker with `pnpm --filter @writer/worker deploy`.
6. In the desktop app, open Settings -> Sync & Account, choose Self-hosted
   Worker, enter your Worker URL, save the bearer token, and test the connection.

The desktop app creates a stable local sync client id and registers it with your
Worker before pushing or pulling document updates. Rotate `GOYO_SYNC_TOKEN` if it
is exposed, then update the token in desktop Settings.

## Security

See [SECURITY.md](SECURITY.md). The current Worker API is not production-ready
and should not receive sensitive writing content until authentication and
ownership checks are implemented.

## License

MIT

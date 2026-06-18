# Goyo

Goyo is a calm, long-form writing app for essays and fiction. The first target
is an Electron desktop app, with shared packages kept portable enough for a
future browser app.

## Status

This project is in early preview. The desktop app, sync API, release automation,
and landing site are still changing quickly.

Important limitations:

- The hosted sync API (`goyo-api.seokjun.kim`) runs on the maintainer's personal
  Cloudflare account. There is no SLA, capacity guarantee, or commitment that
  the hosted endpoint will remain available. Do not rely on it for production
  writing, important backups, or anything you cannot afford to lose.
- The Worker sync API currently supports self-hosted, single-user bearer-token
  auth. Hosted multi-user accounts (Goyo Cloud) are early preview.
- Desktop release artifacts are currently unsigned.
- Preserve your own backups while testing. The maintainer is not responsible for
  data loss on the hosted endpoint.

## Self-Hosted Sync

Goyo can run local-only, connect to Goyo Cloud, or connect to a Cloudflare
Worker that you deploy in your own Cloudflare account. The app build does not
need to be customized; choose the sync mode, URL, and token in Settings.

If you do not want to depend on the maintainer's hosted endpoint, deploy your
own Worker:

1. Create a Cloudflare D1 database.
2. Update `apps/worker/wrangler.jsonc` with your D1 database binding.
3. Apply the Worker migrations with Wrangler.
4. Set a private sync token with `wrangler secret put GOYO_SYNC_TOKEN`.
5. Deploy the Worker with `pnpm --filter @writer/worker deploy`.
6. In the desktop app, open Settings -> Sync & Account, choose Self-hosted
   Worker, enter your Worker URL, save the bearer token, and test the
   connection.

The desktop app creates a stable local sync client id and registers it with
your Worker before pushing or pulling document updates. Rotate
`GOYO_SYNC_TOKEN` immediately if it is exposed, then update the token in
desktop Settings.

You can switch between Local-only, Self-hosted Worker, and Goyo Cloud at any
time from Settings. Local-only writing never leaves the device.

## Releases

Desktop release automation is configured through GitHub Actions. Tagged releases
use `apps/desktop/package.json` as the desktop version source of truth.

Prebuilt binaries for macOS, Windows, and Linux are uploaded to the
[Goyo releases page](https://github.com/colus001/goyo/releases/latest) and
served from the Worker. **Using the maintainer's prebuilt releases is the
recommended way to install Goyo.** The maintainer signs and notarizes
releases when Apple Developer / Windows code signing credentials are
available; check the release notes for the current signing status.

If you build Goyo from source yourself:

- **macOS**: an Apple Developer account and a Developer ID Application
  certificate are required to avoid Gatekeeper friction. Without them, the
  built `.app` will need to be opened via "Open Anyway" in System Settings on
  first launch. Notarization is optional but strongly recommended for
  distribution.
- **Windows**: a code signing certificate avoids the SmartScreen warning on
  first launch. Without one, the unsigned installer is blocked by default and
  users must click "More info" -> "Run anyway".
- **Linux**: AppImage and `.deb` artifacts are unsigned by default. Most
  distributions accept them without further steps.

## Workspace

This repository uses pnpm and Turborepo.

- `apps/desktop`: Electron desktop app. `apps/desktop/package.json` is the
  source of truth for the published desktop version. The other workspace
  packages use their own versions; do not assume they are kept in lockstep.
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

The public landing site and the Goyo Cloud product web app are intentionally
separate. Keep account, login, billing, and authenticated cloud state out of
`apps/landing`; those features belong in `apps/web` and `apps/worker`.

- Landing site: `apps/landing`, deployed with Wrangler to `goyo.seokjun.kim`.
- Goyo Cloud web: `apps/web`, deployed with Wrangler to
  `goyo-cloud.seokjun.kim`.
- Sync and auth API: `apps/worker`, deployed to `goyo-api.seokjun.kim`.

Goyo Cloud signup is currently open. Payment and sync entitlement enforcement
are deferred until the account and hosted sync foundation is stable. Do not
expect hosted signup to remain open if abuse becomes a problem.

Validate the workspace:

```sh
pnpm check
```

Build all packages and apps:

```sh
pnpm build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and
the pull request process. By participating, you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](SECURITY.md). The hosted Worker API is not production-ready
and should not receive sensitive writing content until authentication and
ownership checks are fully implemented. Prefer self-hosted or local-only
modes for personal writing.

## License

MIT

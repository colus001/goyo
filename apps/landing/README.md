# Goyo landing

The public marketing site for Goyo, served at <https://goyo.seokjun.kim>.

This is a standalone Vite + React + Tailwind app. It only renders marketing
copy and download links; it does not own any user accounts, sync state, or
product logic. Keep account, login, billing, and authenticated cloud state
out of this app. Those features belong in `apps/web` and `apps/worker`.

## Development

```sh
pnpm dev:landing
```

## Build

```sh
pnpm --filter @writer/landing build
```

## Deploy

```sh
pnpm --filter @writer/landing deploy
```

Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the
environment.

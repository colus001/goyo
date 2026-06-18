# Security Policy

Goyo is an early-preview writing app. Please do not use the hosted sync API for
production data until multi-user ownership checks and abuse controls are
implemented. Self-hosted sync uses a single-user bearer token and should be
deployed only to infrastructure you control.

## Supported Versions

Security updates target the current `main` branch while the project is in early
development. Tagged desktop builds before a stable release should be treated as
preview builds.

## Reporting a Vulnerability

Please report security issues privately instead of opening a public issue.

Email: mail@seokjun.kim

Include enough detail to reproduce the issue, but do not include private writing
content or credentials. I will acknowledge valid reports as soon as practical
and coordinate a fix before public disclosure.

## Current Known Limitations

- The deployed Worker sync endpoints are not a production-ready public API.
- Self-hosted Worker sync uses bearer-token authentication, but hosted multi-user
  accounts are not implemented yet. Self-hosted documents are scoped to the
  single owner represented by that token.
- Do not send sensitive writing content to a shared or hosted sync API until
  those protections are in place.

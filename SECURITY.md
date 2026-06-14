# Security Policy

Goyo is an early-preview writing app. Please do not use the sync API for
production data until authentication, ownership checks, and abuse controls are
implemented.

## Supported Versions

Security updates target the current `main` branch while the project is in early
development. Tagged desktop builds before a stable release should be treated as
preview builds.

## Reporting a Vulnerability

Please report security issues privately instead of opening a public issue.

Email: seokjun@seokjun.kim

Include enough detail to reproduce the issue, but do not include private writing
content or credentials. I will acknowledge valid reports as soon as practical
and coordinate a fix before public disclosure.

## Current Known Limitations

- The deployed Worker sync endpoints are not a production-ready public API.
- Document ownership and authentication are not implemented yet.
- Do not send sensitive writing content to the sync API until those protections
  are in place.

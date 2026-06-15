name: Feature request
description: Suggest a new behavior, integration, or direction.
labels: ["enhancement"]
---

## Problem

What problem are you trying to solve? If you have a real writing workflow
this affects, describe it. The shape of the problem matters more than the
proposed solution.

## Proposed direction

How do you imagine Goyo handling this? Sketches, references, and links to
similar tools are welcome.

## Alternatives considered

What else did you look at? Existing apps, custom scripts, manual workarounds
you have tried. This helps the maintainer see why a built-in change would
be valuable.

## Scope

Pick the closest match:

- [ ] Small: a localized UI tweak, a new export format, an additional
  setting, a doc fix
- [ ] Medium: a new editor command, a new sync state shape, a new
  preference surface
- [ ] Large: a new platform target (mobile, browser), a new sync transport
  (Durable Objects, WebSocket presence), a new account/billing surface

## Touch points

If you already know which parts of the codebase this would touch, list
them. Otherwise, leave this empty and a maintainer will tag it.

- [ ] `apps/desktop` (Electron main / preload / renderer)
- [ ] `apps/worker` (Cloudflare sync API)
- [ ] `apps/web` (Goyo Cloud product web app)
- [ ] `apps/landing` (public marketing site)
- [ ] `packages/core` (domain logic, sync, recovery)
- [ ] `packages/editor` (Tiptap integration)
- [ ] `packages/ui` (shared React components)
- [ ] `packages/shared` (cross-runtime types)
- [ ] Documentation only

## Willingness to contribute

- [ ] I would like to implement this
- [ ] I would help review, but not implement
- [ ] I am only suggesting, not volunteering

## Out of scope for this issue

Anything you explicitly do not want changed by this feature.

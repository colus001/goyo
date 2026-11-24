# iOS / TestFlight Release

This runbook covers the Expo mobile app only. Desktop releases use the separate
GitHub Actions workflow described in the root [README](../../README.md#releases).
TestFlight installation is not evidence that the [public-beta safety
gate](PUBLIC_BETA_MVP.md#public-beta-release-gate) has passed. Use disposable
writing for the initial device tests and keep independent backups.

## Routine Release: Quick Reference

1. At the repository root, run `pnpm install` and `pnpm check`.
2. In `apps/mobile`, run the commands below. Replace `<build-id>` with the
   successful build ID returned by EAS; do not submit a failed or unrelated build.

```sh
pnpm dlx expo-doctor
pnpm exec expo export --platform ios
eas build --platform ios --profile production
eas submit --platform ios --profile production --id <build-id>
eas submit:status --platform ios --profile production --json --non-interactive
```

3. Wait for Apple processing, assign the build to internal testers, and perform
   the device checks below before inviting more testers.

Neither a Git commit nor a push triggers a mobile build or submission. These are
manual EAS commands; this repository has no mobile release workflow configured.

## Project

| Setting | Value |
| --- | --- |
| Expo owner | `colus001` (personal account) |
| EAS project | [goyo-mobile](https://expo.dev/accounts/colus001/projects/goyo-mobile) |
| EAS project ID | `2930dfa7-a189-41db-852c-7d04049de5c1` |
| iOS bundle identifier | `kim.seokjun.goyo.mobile` |
| App Store Connect | [Goyo](https://appstoreconnect.apple.com/apps/6824169958/testflight), app ID `6824169958` |
| Runtime | Expo SDK 57 / React Native 0.86 |
| Marketing version | `expo.version` in `app.json`; keep mobile `package.json` version aligned |
| iOS build number | Managed remotely by EAS; `production.autoIncrement` increments it |
| Production API | `https://goyo-api.seokjun.kim` |
| Platforms | One iOS app/archive supports iPhone and iPad |

The `production` profile creates a signed App Store archive for TestFlight. The
`preview` profile creates a simulator build, not a physical-device or TestFlight
build. `pnpm build` currently runs TypeScript checks for mobile; it does not
produce an iOS archive.

### iOS 27 SDK readiness

Apple's `ITMS-90725` warning for `0.1.1 (5)` is about the SDK used to build the
app, not its minimum supported iOS version. Apple says new uploads will require
the iOS 27 SDK starting in April 2027.

`xcode27-preview` is a simulator-only profile that pins Xcode 27 and enables
UIKit scene support (`GOYO_IOS_SCENE_SUPPORT=1`) for Expo SDK 57. Regular
`preview` and `production` builds keep their current behavior.

When ready to validate, run `eas build --platform ios --profile xcode27-preview`
from `apps/mobile` without auto-submit. Confirm the Xcode/SDK version in the
build log and test launch, background/foreground, sign-in links, and writing
on an iOS 27 simulator. The preview profile uses the production sync API, so
use disposable writing. After that, opt `production` into the tested image
and scene setting, and validate a new archive with internal TestFlight before
wider distribution. Do not change the minimum iOS version for this transition.

## Environments and Versioning

| Workflow | Configuration | API |
| --- | --- | --- |
| Local development | `pnpm dev:mobile` at the repository root | `http://127.0.0.1:8787` unless overridden |
| Simulator preview | `eas build --platform ios --profile preview` | Hosted production API, explicitly set in `eas.json` |
| TestFlight | `eas build --platform ios --profile production` | Hosted production API, explicitly set in `eas.json` |

Preview currently shares the production backend; there is no separate staging
backend. On a physical device, `127.0.0.1` is the device itself, not the development
Mac. Set `EXPO_PUBLIC_GOYO_CLOUD_API_URL` to a reachable endpoint when testing a
development build on hardware. These public environment values are embedded in
the bundle and must never contain secrets.

Do not manually reset the remote iOS build number. Gaps after failed build
attempts are normal. Change the marketing version deliberately for a new release;
incremental TestFlight fixes can retain that version and use a higher build number.
EAS Update/OTA publishing is not configured by this runbook: ship changes as new
native builds, not as unverified `eas update` commands.

## First-Time Expo Setup

- Install EAS CLI and run `eas login` if needed. Verify `eas whoami` and
  `eas project:info` before uploading; this app belongs to `colus001`.
- The existing EAS project ID is already committed in `app.json`. Do not create a
  replacement project or change the bundle identifier for routine releases.
- A paid Apple Developer membership is required. If creating another app, register
  its bundle ID and App Store Connect app record before submission. For Goyo, use
  the existing App Store Connect ID in `eas.json`.

## First-Time Apple Signing Setup

Run from `apps/mobile` in an interactive terminal:

```sh
eas credentials:configure-build --platform ios --profile production
```

Sign in to Apple if prompted, select the Apple Developer team, and configure the
distribution certificate and App Store provisioning profile for the bundle ID
above. Reuse valid existing credentials when offered. EAS stores signing
credentials remotely; do not put certificates, private keys, or passwords in Git.

When prompted to generate a provisioning profile, creating one for Goyo's bundle
ID does not change other apps' profiles. Distribution certificates can be shared
across apps: do not revoke or replace a certificate used elsewhere merely to fix
this project's build.

Expo login alone does not set up Apple signing for a new EAS project. A build in
non-interactive mode requires signing credentials to have been configured first.

## First-Time Submission API Key Setup

Build signing and submission authentication are separate:

| Purpose | Required credentials |
| --- | --- |
| Sign the `.ipa` | Distribution certificate and App Store provisioning profile |
| Upload to App Store Connect | App Store Connect API key assigned to this EAS project |

From `apps/mobile`, run:

```sh
eas credentials --platform ios
```

Select **production** → **App Store Connect: Manage your API Key** → **Set up your
project to use an API Key for EAS Submit**. Reuse an appropriate existing key when
available. Confirm the CLI reports that the key is assigned to
`goyo-mobile: kim.seokjun.goyo.mobile`.

An Apple Developer **Individual membership** is not the same thing as an
**Individual API Key**. Individual API keys cannot use Apple's Provisioning API
endpoints. For API-based provisioning, EAS documents a Team API key with Admin
access; see [Apple key types](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api.md)
and [EAS API authentication](https://docs.expo.dev/build/building-on-ci/#optional-provide-an-asc-api-token-for-your-apple-team).
This app currently uses a remotely stored submission key; no `.p8` belongs in the
repository. Never paste passwords, private keys, or tokens into release notes.

### Apple Login / Cached Password Troubleshooting

If EAS reports that it used a password from Keychain and Apple returns `-20209`,
first check whether a fresh sign-in works at https://developer.apple.com/account/.
A browser with an existing session may still work while a fresh authentication
attempt fails. To bypass the cached Keychain password for one CLI invocation:

```sh
EXPO_NO_KEYCHAIN=1 eas credentials:configure-build --platform ios --profile production
```

Enter the current Apple Account password, not an app-specific upload password.
If Apple still reports that the account is locked, resolve the lock at
https://iforgot.apple.com before retrying. To replace a stale saved password,
remove only the matching `deliver.<Apple ID>` item in Keychain Access; see
https://docs.expo.dev/app-signing/security/#keychain.

## Validation

From the repository root:

```sh
pnpm check
```

From `apps/mobile`:

```sh
pnpm dlx expo-doctor
pnpm exec expo export --platform ios
```

The export command checks the production JavaScript/Hermes bundle. It does not
compile or sign the native iOS application.

## Build and Submit

From `apps/mobile`:

```sh
eas build --platform ios --profile production
eas submit --platform ios --profile production --id <build-id>
```

The submission profile is linked to App Store Connect app `6824169958`. On the
first submission, configure App Store Connect submission credentials if prompted.

For automated builds after signing setup:

```sh
eas build --platform ios --profile production --non-interactive --no-wait
eas build:list --platform ios --limit 5
```

Track a build or submission without scheduling a duplicate:

```sh
eas build:view <build-id> --json
eas submit:view <submission-id> --json
eas submit:status --platform ios --profile production --json --non-interactive
```

Only submit after build status is `FINISHED`. Submission status `FINISHED` means
EAS finished uploading; it does not guarantee Apple finished processing. Look for
`processingState: VALID` and `internalState: READY_FOR_BETA_TESTING` in the status
output. Do not rebuild just because an uploaded build is not immediately visible.

## Internal TestFlight

1. Wait for Apple to process the uploaded build.
2. Complete any App Store Connect compliance prompts. The app declares standard
   exempt encryption in `ITSAppUsesNonExemptEncryption`; review this declaration
   when introducing custom encryption.
3. Add the build to an internal testing group and invite the intended testers.
   EAS created `Team (Expo)` for this app. Verify both tester membership and build
   assignment; a group's existence alone does not grant access. Internal testers
   must be eligible App Store Connect users. TestFlight should use the Apple
   account that accepted the invitation.
4. Install on iPhone and iPad through TestFlight.
5. Verify writing persistence, login, Desktop sync, rotation, narrow multitasking
   windows, and upgrades using `PUBLIC_BETA_MVP.md`.

External TestFlight distribution additionally requires beta review information
and Apple's Beta App Review. The public-beta release gate remains tracked in
`PUBLIC_BETA_MVP.md`.

### Physical-Device Smoke Test

- Install on both iPhone and iPad; confirm the version/build number.
- Use a disposable book and verify login, library loading, navigation, writing,
  restart persistence, offline/reconnect, and Desktop sync.
- On iPad, test portrait/landscape, Split View/Stage Manager, and software and
  hardware keyboards. Wide windows (at least 1100 pt) use a collapsible sidebar;
  narrower windows use the overlay menu. Check text selection and cursor position
  during rotation/resizing, not only whether the layout fits.
- Upgrade over an existing TestFlight installation and confirm SQLite writing is
  preserved. Do not uninstall first; uninstalling can remove local writing.
- Check large Dynamic Type and VoiceOver. These remain manual verification items,
  not guarantees inferred from a successful archive.

## Failure Handling

| Symptom | Action |
| --- | --- |
| Missing credentials in non-interactive build | Complete Apple signing setup above; Expo login is not Apple signing |
| `App Store Connect API Keys cannot be set up in --non-interactive mode` | Assign the EAS Submit key using the exact menu above |
| CocoaPods rejects Reanimated / React Native versions | Use `pnpm exec expo install react-native-reanimated react-native-worklets`; keep SDK-compatible versions explicit |
| EAS Submit finished, but no TestFlight build yet | Check Apple processing and compliance prompts; don't upload the same build repeatedly |
| TestFlight build exists but isn't offered to a device | Check internal group build assignment, invitation, Apple account, and device OS compatibility |

For a bad beta build, stop assigning it and expire it in App Store Connect if
necessary. This stops further testing, but does not undo an installation or a
database migration. Ship a corrected build with a higher build number. Never
delete local writing, reset SQLite, or roll back schemas as an automatic recovery
step. External rollout and data-loss incident response remain public-beta release
blockers until their checklist items are completed.

## Release Record: 2026-10-18 — 0.1.1 (4)

On 2026-10-18, Expo Doctor passed all 21 checks, the iOS production Hermes export
succeeded, and `pnpm check` passed (164 tests passed, 6 skipped). The EAS archive
attempt stopped before entering the build queue because Apple signing credentials
had not been configured for this project. No archive or TestFlight upload was
created. The two attempts initialized remote build number 1 and then incremented
it to 2; gaps in build numbers are expected.

Apple signing was subsequently configured. Build 3 reached CocoaPods but failed
because an automatically installed Reanimated 4.3.1 peer did not support React
Native 0.86.3. Reanimated 4.5.1 and Worklets 0.10.1 are now explicit dependencies,
using the SDK 57 recommended versions so native autolinking uses compatible code.

Build `0.1.1 (4)` succeeded on EAS:
https://expo.dev/accounts/colus001/projects/goyo-mobile/builds/f3a09c3f-3e97-4ac0-bff8-fe7ad576328c

The initial submission attempt stopped because this project's App Store Connect
API key had not been configured. After an existing API key was assigned through
`eas credentials --platform ios`, submission of `0.1.1 (4)` finished successfully:
https://expo.dev/accounts/colus001/projects/goyo-mobile/submissions/dcc27b1c-7ded-48e6-b764-8689f7480b9f

EAS also created the internal TestFlight group `Team (Expo)`. App Store Connect
reports build `0.1.1 (4)` as `VALID` and `READY_FOR_BETA_TESTING`; Apple processing
has completed. Tester membership and installation still need to be confirmed.
To check the uploaded build's visibility:

```sh
eas submit:status --platform ios --profile production --json --non-interactive
```

Apple build signing and App Store Connect submission credentials are separate;
both are now configured for this project.

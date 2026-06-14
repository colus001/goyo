'use strict';

const { notarize } = require('@electron/notarize');
const { execSync } = require('node:child_process');

const appId = 'kim.seokjun.goyo';

exports.default = async function notarizeApp(context) {
  const { appOutDir, electronPlatformName } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;
  const hasNotarizationCredentials = Boolean(appleId && appleIdPassword && teamId);
  const isCI = process.env.CI === 'true';
  const isSigned = isAppSigned(appPath);

  if (!isSigned) {
    const message = `[notarize] ${appPath} is not signed.`;

    if (hasNotarizationCredentials) {
      throw new Error(`${message} Aborting notarization.`);
    }

    console.warn(`${message} Skipping notarization for unsigned build.`);
    return;
  }

  if (!hasNotarizationCredentials) {
    const message =
      '[notarize] APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID must all be set.';

    if (isCI) {
      throw new Error(
        `${message} Aborting notarization in CI to prevent shipping an unsigned macOS build.`,
      );
    }

    console.warn(`${message} Skipping notarization for local build.`);
    return;
  }

  console.log(`[notarize] Notarizing ${appPath} (${appId})...`);

  await notarize({
    appPath,
    appleId,
    appleIdPassword,
    teamId,
    tool: 'notarytool',
  });

  console.log('[notarize] Notarization complete, stapling ticket...');

  try {
    execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'inherit' });
    console.log('[notarize] Staple complete.');
  } catch (error) {
    console.warn('[notarize] Staple failed (non-fatal):', error.message);
  }
};

function isAppSigned(appPath) {
  try {
    execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

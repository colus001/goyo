const { execFileSync } = require('node:child_process');
const { rmSync, writeFileSync } = require('node:fs');
const { homedir, tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const electronBin = require('electron');

const desktopDir = resolve(__dirname, '..');
const appRoot = resolve(desktopDir);
const launcherApp = join(desktopDir, 'dev/Goyo Dev.app');
const contentsDir = join(launcherApp, 'Contents');
const infoPlistPath = join(contentsDir, 'Info.plist');
const devBundleId = 'kim.seokjun.goyo.dev';
const devScheme = 'goyo-dev';

rmSync(launcherApp, { force: true, recursive: true });
execFileSync(
  'osacompile',
  [
    '-o',
    launcherApp,
    '-e',
    `on open location theUrl
  set logPath to (POSIX path of (path to home folder)) & "Library/Logs/Goyo Dev Protocol.log"
  do shell script "printf '[%s] goyo-dev launcher url: %s\\n' \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\" " & quoted form of theUrl & " >> " & quoted form of logPath
  do shell script ${quoteAppleScript(`${shellQuote(electronBin)} ${shellQuote(appRoot)} `)} & quoted form of theUrl & " >/dev/null 2>&1 &"
end open location

on run
  set logPath to (POSIX path of (path to home folder)) & "Library/Logs/Goyo Dev Protocol.log"
  do shell script "printf '[%s] goyo-dev launcher opened without url\\n' \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\" >> " & quoted form of logPath
end run`,
  ],
  { stdio: 'inherit' },
);

writeFileSync(
  infoPlistPath,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>Goyo Dev</string>
  <key>CFBundleExecutable</key>
  <string>applet</string>
  <key>CFBundleIdentifier</key>
  <string>${devBundleId}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Goyo Dev</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>0.1.0</string>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeRole</key>
      <string>Editor</string>
      <key>CFBundleURLName</key>
      <string>Goyo Dev</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>${devScheme}</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
`,
);

execFileSync(
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister',
  ['-f', launcherApp],
  { stdio: 'inherit' },
);
execFileSync(
  'swift',
  [
    '-e',
    `import Foundation; import CoreServices; LSSetDefaultHandlerForURLScheme("${devScheme}" as CFString, "${devBundleId}" as CFString)`,
  ],
  { stdio: 'inherit' },
);
repairUserLaunchServicesHandler();

console.log(`Registered goyo-dev:// with ${launcherApp}`);

function repairUserLaunchServicesHandler() {
  const plistPath = join(
    homedir(),
    'Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist',
  );
  let plist;
  try {
    plist = JSON.parse(
      execFileSync('plutil', ['-convert', 'json', '-o', '-', plistPath], {
        encoding: 'utf8',
      }),
    );
  } catch {
    return;
  }

  const handlers = Array.isArray(plist.LSHandlers) ? plist.LSHandlers : [];
  const existing = handlers.find((handler) => handler.LSHandlerURLScheme === devScheme);
  const handler = existing ?? { LSHandlerURLScheme: devScheme };
  handler.LSHandlerRoleAll = devBundleId;
  handler.LSHandlerPreferredVersions = { LSHandlerRoleAll: '-' };
  handler.LSHandlerModificationDate = Math.floor(Date.now() / 1000 - 978_307_200);
  if (!existing) handlers.push(handler);
  plist.LSHandlers = handlers;

  const tempPath = join(tmpdir(), `goyo-dev-launchservices-${process.pid}.json`);
  writeFileSync(tempPath, JSON.stringify(plist));
  execFileSync('plutil', ['-convert', 'binary1', '-o', plistPath, tempPath], { stdio: 'inherit' });
  try {
    execFileSync('killall', ['cfprefsd'], { stdio: 'ignore' });
  } catch {
    // cfprefsd may not be running; preferences will still be picked up later.
  }
}

function quoteAppleScript(value) {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

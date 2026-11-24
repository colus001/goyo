const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  'isomorphic-webcrypto': path.resolve(projectRoot, 'node_modules/isomorphic-webcrypto'),
};
config.resolver.resolveRequest = (context, name, platform) => {
  // Expo's DOM island and the shared editor must use the same React as this app.
  const isReactPackage = /^(react|react-dom)(\/|$)/.test(name);
  return context.resolveRequest(
    isReactPackage
      ? { ...context, originModulePath: path.join(projectRoot, 'package.json') }
      : context,
    name,
    platform,
  );
};

module.exports = config;

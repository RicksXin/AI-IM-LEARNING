const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: new Proxy(
      {},
      {
        get: (_, name) => path.join(__dirname, 'node_modules', String(name)),
      },
    ),
  },
  watchFolders: [path.resolve(__dirname, '../modules')],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

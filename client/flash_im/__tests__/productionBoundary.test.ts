/**
 * @format
 */

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..');

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('production entry does not import playground or fireworks screens', () => {
  const productionEntryFiles = ['index.js', 'App.tsx'].map(readProjectFile);
  const productionSource = productionEntryFiles.join('\n');

  expect(productionSource).not.toContain('src/playground');
  expect(productionSource).not.toContain('PlaygroundApp');
  expect(productionSource).not.toContain('FireworksShowScreen');
  expect(productionSource).not.toContain('FireworksPlayground');
});

test('playground has its own entry file', () => {
  const playgroundEntry = readProjectFile('index.playground.js');

  expect(playgroundEntry).toContain('./src/playground/PlaygroundApp');
  expect(playgroundEntry).toContain('AppRegistry.registerComponent');
});

test('project exposes explicit playground and production bundle commands', () => {
  const packageJson = JSON.parse(readProjectFile('package.json'));

  expect(packageJson.scripts['android:playground']).toContain(
    '-PjsMainModuleName=index.playground',
  );
  expect(packageJson.scripts['bundle:playground:android']).toContain(
    '--entry-file index.playground.js',
  );
  expect(packageJson.scripts['bundle:android:release']).toContain(
    '--entry-file index.js',
  );
  expect(packageJson.scripts['bundle:android:release']).toContain('--dev false');
});

test('android debug can switch to the playground entry while release stays on production', () => {
  const mainApplication = readProjectFile(
    'android/app/src/main/java/com/toly1994/flash_im/MainApplication.kt',
  );
  const buildGradle = readProjectFile('android/app/build.gradle');

  expect(mainApplication).toContain(
    'jsMainModulePath = BuildConfig.JS_MAIN_MODULE_NAME',
  );
  expect(buildGradle).toContain('project.findProperty("jsMainModuleName")');
  expect(buildGradle).toContain(
    'buildConfigField "String", "JS_MAIN_MODULE_NAME", "\\"${jsMainModuleName}\\""',
  );
  expect(buildGradle).toContain(
    'buildConfigField "String", "JS_MAIN_MODULE_NAME", "\\"index\\""',
  );
});

test('android debug allows local playground http while release keeps cleartext disabled', () => {
  const manifest = readProjectFile('android/app/src/main/AndroidManifest.xml');
  const buildGradle = readProjectFile('android/app/build.gradle');

  expect(manifest).toContain(
    'android:usesCleartextTraffic="${usesCleartextTraffic}"',
  );
  expect(buildGradle).toContain(
    'manifestPlaceholders = [usesCleartextTraffic: "true"]',
  );
  expect(buildGradle).toContain(
    'manifestPlaceholders = [usesCleartextTraffic: "false"]',
  );
});

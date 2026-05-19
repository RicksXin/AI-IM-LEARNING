/**
 * @format
 */

import { AppRegistry } from 'react-native';
import PlaygroundApp from './src/playground/PlaygroundApp';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => PlaygroundApp);

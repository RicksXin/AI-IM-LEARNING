import { Platform } from 'react-native';

export const androidEmulatorHost = '10.0.2.2';
export const localMachineHost = '127.0.0.1';

export function getDefaultPlaygroundHost() {
  return Platform.OS === 'android' ? androidEmulatorHost : localMachineHost;
}

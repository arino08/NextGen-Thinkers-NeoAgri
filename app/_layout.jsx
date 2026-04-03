import { registerGlobals } from 'react-native-webrtc';
registerGlobals();

import { Slot } from 'expo-router';

export default function Layout() {
  return <Slot />;
}

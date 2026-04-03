import { Stack } from 'expo-router';
import { registerGlobals } from 'react-native-webrtc';
registerGlobals();

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

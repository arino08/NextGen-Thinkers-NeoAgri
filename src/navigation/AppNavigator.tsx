import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import SplashScreen from '../screens/SplashScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import CameraHomeScreen from '../screens/CameraHomeScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import DroneServiceScreen from '../screens/DroneServiceScreen';
import DiseaseResultScreen from '../screens/DiseaseResultScreen';
import HomeScreen from '../screens/HomeScreen';
import ViewMapScreen from '../screens/ViewMapScreen';
import HistoryScreen from '../screens/HistoryScreen';
import RequestServiceScreen from '../screens/RequestServiceScreen';
import { colors } from '../theme/colors';

type FarmData = {
  name: string;
  farmSize: string;
  cropType: string;
  location: string;
  timestamp: number;
};

export type RootStackParamList = {
  Splash: undefined;
  Language: undefined;
  Home: undefined;
  ViewMap: undefined;
  History: undefined;
  RequestService: { farmData: FarmData };
  SwipeHub: undefined;
  DiseaseResult: { photoUri?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator();

// ✅ MainSwipeHub is preserved EXACTLY as before — not modified
function MainSwipeHub() {
  return (
    <Tab.Navigator
      initialRouteName="CameraHome"
      backBehavior="initialRoute"
      screenOptions={{
        tabBarStyle: { display: 'none' },
        swipeEnabled: true,
      }}
    >
      <Tab.Screen name="AIAssistant" component={AIAssistantScreen} />
      <Tab.Screen name="CameraHome" component={CameraHomeScreen} />
      <Tab.Screen name="DroneService" component={DroneServiceScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0F0C' },
          animation: 'fade_from_bottom',
        }}
      >
        {/* ── Existing screens (untouched) ── */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Language" component={LanguageSelectionScreen} />
        <Stack.Screen name="DiseaseResult" component={DiseaseResultScreen} />

        {/* ── New Home entry point ── */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ animation: 'fade' }}
        />

        {/* ── New feature screens ── */}
        <Stack.Screen
          name="ViewMap"
          component={ViewMapScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="RequestService"
          component={RequestServiceScreen}
          options={{ animation: 'slide_from_bottom' }}
        />

        {/* ── Swipe hub (existing — untouched) ── */}
        <Stack.Screen
          name="SwipeHub"
          component={MainSwipeHub}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

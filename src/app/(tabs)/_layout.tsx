// Untere Leiste mit genau drei Reitern: Bots · Hilfe · Konto.
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { C } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          position: 'absolute',
          borderTopColor: C.separator,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(10,11,15,0.96)',
          minHeight: 56,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} /> : null,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tab.bots'), tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'hardware-chip' : 'hardware-chip-outline'} size={25} color={String(color)} /> }}
      />
      <Tabs.Screen
        name="help"
        options={{ title: t('tab.help'), tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'help-buoy' : 'help-buoy-outline'} size={25} color={String(color)} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t('tab.account'), tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={25} color={String(color)} /> }}
      />
    </Tabs>
  );
}

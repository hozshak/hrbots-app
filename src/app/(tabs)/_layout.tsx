// Untere Leiste mit drei großen Reitern: Bots · Hilfe · Konto. Fest (nicht über dem Inhalt), damit nichts verdeckt wird.
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { C } from '@/lib/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        tabBarAllowFontScaling: false,
        tabBarStyle: { backgroundColor: C.bg2, borderTopColor: C.cardBorder, borderTopWidth: 1, height: 72 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 10) },
        tabBarItemStyle: { minHeight: 52 },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tab.bots'), tabBarButtonTestID: 'tab-bots', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'happy' : 'happy-outline'} size={26} color={String(color)} /> }}
      />
      <Tabs.Screen
        name="help"
        options={{ title: t('tab.help'), tabBarButtonTestID: 'tab-help', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'help-buoy' : 'help-buoy-outline'} size={26} color={String(color)} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t('tab.account'), tabBarButtonTestID: 'tab-account', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={26} color={String(color)} /> }}
      />
    </Tabs>
  );
}

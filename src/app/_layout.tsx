// Wurzel: Daten-Cache, Anmeldung prüfen und passend umleiten (Anmeldung / Discord-Pflicht / App).
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { queryClient } from '@/lib/query';
import { boot, useSession } from '@/lib/session';
import { C } from '@/lib/theme';
import { t } from '@/lib/i18n';
import { ToastHost } from '@/components/Toast';
import { FixItSheet } from '@/components/FixItSheet';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Seiten, die auch ohne verknüpftes Discord erreichbar sind (Konto löschen muss immer gehen)
const NO_DISCORD_OK = ['discord', 'account', 'delete-account', 'help'];

// Tiefe Links (z. B. hrbots://bot/mod/3) haben immer die Reiter darunter, damit „Zurück“ funktioniert
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function Root() {
  const session = useSession();
  const [fonts] = useFonts(Ionicons.font);
  const segs = useSegments();
  const router = useRouter();

  useEffect(() => {
    boot();
  }, []);
  const ready = session.phase !== 'booting' && fonts;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (session.phase === 'booting') return;
    const parts = segs as string[];
    const first = parts[0] ?? '';
    if (session.phase === 'out') {
      if (first !== 'login') router.replace('/login');
      return;
    }
    if (session.user && !session.user.discord_linked) {
      if (!parts.some((p) => NO_DISCORD_OK.includes(p))) router.replace('/discord');
      return;
    }
    if (first === 'login' || first === 'discord') router.replace('/');
  }, [session.phase, session.user?.discord_linked, segs.join('/')]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: C.bg },
              headerShadowVisible: false,
              headerTintColor: C.accent,
              headerTitleStyle: { color: C.text, fontWeight: '600' },
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: C.bg },
            }}
          >
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="discord" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('bots.title') }} />
            <Stack.Screen name="new" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="bot/[kind]/[id]" options={{ title: '', headerBackTitle: t('tab.bots') }} />
            <Stack.Screen name="delete-account" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
          <FixItSheet />
          <ToastHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wurzel: Schriften + Sprache laden, Anmeldung prüfen und passend umleiten (Anmeldung / Discord-Pflicht / App).
// Sprachwechsel: die ganze Oberfläche wird mit neuem `key` neu gezeichnet (Navigation bleibt erhalten), Arabisch mit
// `direction: 'rtl'` gespiegelt – ohne Neustart. Alle Seiten haben ihre eigene Kopfzeile innerhalb des sicheren Bereichs.
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Syne_700Bold, Syne_800ExtraBold } from '@expo-google-fonts/syne';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { queryClient } from '@/lib/query';
import { boot, useSession } from '@/lib/session';
import { C } from '@/lib/theme';
import { loadLang, useLang } from '@/lib/i18n';
import { ToastHost } from '@/components/Toast';
import { FixItSheet } from '@/components/FixItSheet';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Seiten, die auch ohne verknüpftes Discord erreichbar sind (Konto löschen muss immer gehen)
const NO_DISCORD_OK = ['discord', 'account', 'delete-account', 'help', 'language'];

// Tiefe Links (z. B. hrbots://bot/mod/3) haben immer die Reiter darunter, damit „Zurück“ funktioniert
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function Root() {
  const session = useSession();
  const lang = useLang();
  const [langReady, setLangReady] = useState(false);
  const [fonts, fontError] = useFonts({ ...Ionicons.font, Syne_700Bold, Syne_800ExtraBold, DMMono_400Regular, DMMono_500Medium });
  const segs = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadLang().finally(() => setLangReady(true));
    boot();
  }, []);
  // fehlt eine Schrift, trotzdem starten (Systemschrift)
  const ready = session.phase !== 'booting' && (fonts || !!fontError) && langReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (session.phase === 'booting') return;
    const parts = segs as string[];
    const first = parts[0] ?? '';
    if (session.phase === 'out') {
      if (first !== 'login' && first !== 'language' && first !== 'register') router.replace('/login');
      return;
    }
    if (session.user && !session.user.discord_linked) {
      if (!parts.some((p) => NO_DISCORD_OK.includes(p))) router.replace('/discord');
      return;
    }
    if (first === 'login' || first === 'discord' || first === 'register') router.replace('/');
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
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <View key={lang} style={{ flex: 1, backgroundColor: C.bg, direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
              <Stack.Screen name="login" options={{ animation: 'fade' }} />
              <Stack.Screen name="register" options={{ animation: 'fade' }} />
              <Stack.Screen name="discord" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="new" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="delete-account" options={{ presentation: 'fullScreenModal' }} />
            </Stack>
            <FixItSheet />
            <ToastHost />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

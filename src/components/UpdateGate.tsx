// Update-Hinweis: fragt beim Start (und wenn die App wieder nach vorne kommt, höchstens alle 30 Min.) GET /app/version.
//  - App älter als `min`    → „Update erforderlich“, ganzer Bildschirm, ohne „Später“ (App ist gesperrt bis zum Update).
//  - App älter als `latest` → „Neue Version verfügbar“ mit „Jetzt aktualisieren“ und „Später“ (kommt beim nächsten Start wieder).
// `latest` liest der Server automatisch aus dem App Store; `min` setzt man auf dem Server (app_config 'ios_min_version').
// Ohne Verbindung oder bei Fehlern passiert nichts – die App darf nie wegen dieser Prüfung hängen bleiben.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { MOCK, request } from '@/api/transport';
import { t } from '@/lib/i18n';
import { C, glow, PRIMARY_GRADIENT, R, S, T } from '@/lib/theme';
import { Button, Txt } from '@/components/ui';

type VersionInfo = { latest: string | null; min: string | null; store_url: string };
const APP_STORE_ID = '6838086083';
const RECHECK_MS = 30 * 60 * 1000;

/** „1.3.10“ > „1.3.9“: Zahl für Zahl vergleichen. <0 = a älter als b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function currentVersion(): string {
  return (Platform.OS === 'web' ? null : Application.nativeApplicationVersion) ?? Constants.expoConfig?.version ?? '0';
}

async function openStore(url: string) {
  const native = `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`;
  try {
    if (Platform.OS === 'ios' && (await Linking.canOpenURL(native))) return await Linking.openURL(native);
  } catch {}
  Linking.openURL(url).catch(() => {});
}

export function UpdateGate() {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [later, setLater] = useState<string | null>(null); // „Später“ für diese Version, nur bis zum nächsten Start
  const lastCheck = useRef(0);
  // nur im iPhone-App und in der Browser-Vorschau mit Beispieldaten – nicht auf der echten Webseite
  const active = Platform.OS === 'ios' || MOCK;

  const check = useCallback(async () => {
    if (!active || Date.now() - lastCheck.current < RECHECK_MS) return;
    lastCheck.current = Date.now();
    try {
      setInfo(await request<VersionInfo>('GET', '/app/version'));
    } catch {
      lastCheck.current = 0; // nächstes Mal erneut versuchen
    }
  }, [active]);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);

  if (!info) return null;
  const mine = currentVersion();
  const forced = !!info.min && compareVersions(mine, info.min) < 0;
  const newer = !!info.latest && compareVersions(mine, info.latest) < 0;
  if (!forced && (!newer || later === info.latest)) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!forced) setLater(info.latest); }}>
      <View style={{ flex: 1, backgroundColor: forced ? C.bg : 'rgba(3,5,12,0.78)', alignItems: 'center', justifyContent: 'center', padding: S.xl }}>
        <View
          testID="update-gate"
          style={{
            width: '100%', maxWidth: 420, backgroundColor: C.card2, borderRadius: R.xl + 6, borderWidth: 1, borderColor: C.cardBorder,
            padding: S.xl, alignItems: 'center', gap: S.md,
          }}
        >
          <View style={[{ width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: S.xs }, glow(C.accent, 0.5)]}>
            <LinearGradient colors={PRIMARY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0, borderRadius: 38 }} />
            <Ionicons name={forced ? 'arrow-up' : 'sparkles'} size={34} color={C.onAccent} />
          </View>
          <Txt style={[T.title, { textAlign: 'center' }]}>{t(forced ? 'update.forcedTitle' : 'update.title')}</Txt>
          <Txt style={[T.body, { color: C.text2, textAlign: 'center' }]}>{t(forced ? 'update.forcedText' : 'update.text')}</Txt>
          {info.latest ? (
            <Txt style={[T.caption, { color: C.dim, textAlign: 'center' }]}>{t('update.versions', { mine, latest: info.latest })}</Txt>
          ) : null}
          <Button label={t('update.now')} icon="logo-apple-appstore" onPress={() => openStore(info.store_url)} style={{ alignSelf: 'stretch', marginTop: S.sm }} testID="update-now" />
          {!forced ? <Button label={t('update.later')} variant="ghost" small onPress={() => setLater(info.latest)} style={{ alignSelf: 'stretch' }} testID="update-later" /> : null}
        </View>
      </View>
    </Modal>
  );
}

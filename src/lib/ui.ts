// Kleine Helfer: Haptik, Bestätigungsdialog (auch im Browser), Links öffnen.
import { Alert, Linking, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { t } from './i18n';

export const haptic = {
  tap() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error() {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  select() {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  },
};

/** Ja/Nein-Frage. Alert.alert mit Knöpfen geht im Browser nicht → dort window.confirm. */
export function confirm(title: string, message: string, okLabel: string, destructive = true): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

export function openUrl(url: string) {
  WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => {});
}

/** Raum-Link so umschreiben, dass iOS ihn der Highrise-App gibt.
 *  Die Highrise-App ist nur für Pfade wie /room/<id> und /world/<id> zuständig (apple-app-site-association).
 *  Links wie high.rs/room?id=<id> öffnen deshalb nur den Browser.
 *  Immer highrise.game, nie high.rs: high.rs leitet per 308 auf highrise.game weiter, und nach einer Weiterleitung
 *  öffnet iOS die App nicht mehr (1.3.2 mit high.rs/room/<id> landete so im Browser auf „Seite nicht gefunden“). */
export function highriseAppLink(url: string): string {
  const s = (url || '').trim();
  const p = s.match(/^https?:\/\/(?:[\w-]+\.)*(?:high\.rs|highrise\.game)\/(room|world)\/([A-Za-z0-9_-]+)/i);
  if (p) return `https://highrise.game/${p[1].toLowerCase()}/${p[2]}`;
  const m = s.match(/[?&](?:ownedRoomId|id)=([a-f0-9]{24})/i) || s.match(/\/rooms?\/([a-f0-9]{24})(?![a-f0-9])/i) || s.match(/^([a-f0-9]{24})$/i);
  return m ? `https://highrise.game/room/${m[1].toLowerCase()}` : s;
}

/** Highrise-Raum-Link: über das System öffnen, damit die Highrise-App aufgeht (falls installiert), sonst Browser */
export function openRoom(url: string) {
  const link = highriseAppLink(url);
  if (Platform.OS === 'web') return openUrl(link);
  Linking.openURL(link).catch(() => openUrl(link));
}

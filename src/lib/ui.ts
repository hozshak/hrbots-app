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

/** Raum-Link so, dass die Highrise-App aufgeht – genau wie highrise.game selbst es macht (Code der Highrise-Webseite):
 *  iPhone: Singular-Link highrise.sng.link/Cxfcy/…?_dl=https://high.rs/room?id=<id> – dafür ist die Highrise-App
 *  als Universal Link eingetragen (apple-app-site-association von highrise.sng.link); ohne App → App Store.
 *  NICHT high.rs/room/… oder highrise.game/room/…: die landeten in 1.3.2/1.3.3 im Browser auf „page not found“. */
const HR_APP_LINK = {
  room: { ios: 'https://highrise.sng.link/Cxfcy/t9zw?_dl=https%3A%2F%2Fhigh.rs%2Froom%3Fid=', android: 'https://highrise.sng.link/Bxfcy/4npc?_dl=https%3A%2F%2Fhigh.rs%2Froom%3Fid=' },
  world: { ios: 'https://highrise.sng.link/Cxfcy/8l8n?_dl=https%3A%2F%2Fhigh.rs%2Fworld%3Fid=', android: 'https://highrise.sng.link/Bxfcy/yo03?_dl=https%3A%2F%2Fhigh.rs%2Fworld%3Fid=' },
} as const;

export function highriseAppLink(url: string): string {
  const s = (url || '').trim();
  if (/^https:\/\/highrise\.sng\.link\//i.test(s)) return s;
  let kind: 'room' | 'world' = 'room';
  let id = '';
  const p = s.match(/^https?:\/\/(?:[\w-]+\.)*(?:high\.rs|highrise\.game)\/(?:[a-z]{2}\/)?(room|world)\/([A-Za-z0-9_-]+)/i);
  if (p) { kind = p[1].toLowerCase() as 'room' | 'world'; id = p[2]; }
  else {
    const m = s.match(/[?&](?:ownedRoomId|id)=([a-f0-9]{24})/i) || s.match(/\/rooms?\/([a-f0-9]{24})(?![a-f0-9])/i) || s.match(/^([a-f0-9]{24})$/i);
    if (!m) return s;
    id = m[1].toLowerCase();
    if (/\/world\b/i.test(s)) kind = 'world';
  }
  return Platform.OS === 'android' ? HR_APP_LINK[kind].android + id : `${HR_APP_LINK[kind].ios}${id}&_smtype=3`;
}

/** Highrise-Raum-Link: über das System öffnen, damit die Highrise-App aufgeht (falls installiert), sonst Browser */
export function openRoom(url: string) {
  const link = highriseAppLink(url);
  if (Platform.OS === 'web') return openUrl(link);
  Linking.openURL(link).catch(() => openUrl(link));
}

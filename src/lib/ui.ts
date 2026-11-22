// Kleine Helfer: Haptik, Bestätigungsdialog (auch im Browser), Links öffnen.
import { Alert, Platform } from 'react-native';
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

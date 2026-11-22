// Sprache: Englisch, Deutsch, Arabisch. Einstellung „Automatisch“ folgt der iPhone-Sprache (ar → Arabisch, de → Deutsch,
// sonst Englisch). Die Wahl wird gespeichert (SecureStore, im Browser localStorage) und wirkt sofort:
// die Wurzel der App hört auf useLang() und zeichnet alles neu; Arabisch spiegelt das Layout über `direction: 'rtl'`
// (kein I18nManager.forceRTL → kein Neustart nötig, kein Absturz).
// Platzhalter: t('key', { n: 3 }) ersetzt {n}. ({username} in Willkommenstexten ist KEIN Platzhalter hier.)
import { useSyncExternalStore } from 'react';
import { I18nManager, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';
import { en, type Key } from './lang/en';
import { de } from './lang/de';
import { ar } from './lang/ar';
import { setTextDirection } from './theme';

export type { Key };
export type Lang = 'en' | 'de' | 'ar';
export type LangSetting = 'auto' | Lang;
export const LANG_SETTINGS: LangSetting[] = ['auto', 'de', 'en', 'ar'];
/** Namen der Sprachen immer in der eigenen Sprache */
export const LANG_NAMES: Record<Lang, string> = { de: 'Deutsch', en: 'English', ar: 'العربية' };

const DICTS: Record<Lang, Record<Key, string>> = { en, de, ar };
const STORE_KEY = 'hrbots.lang';

// Die App bleibt technisch immer LTR; gespiegelt wird selbst (siehe oben).
try {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
} catch {}

export function deviceLang(): Lang {
  try {
    const forced = process.env.EXPO_PUBLIC_LANG;
    if (forced === 'de' || forced === 'en' || forced === 'ar') return forced;
    for (const l of getLocales()) {
      const code = l.languageCode?.toLowerCase();
      if (code === 'ar') return 'ar';
      if (code === 'de') return 'de';
      if (code === 'en') return 'en';
    }
  } catch {}
  return 'en';
}

let setting: LangSetting = 'auto';
let current: Lang = deviceLang();
setTextDirection(current === 'ar');
const subs = new Set<() => void>();

function apply(next: Lang) {
  current = next;
  setTextDirection(next === 'ar');
  subs.forEach((f) => f());
}

export const getLang = () => current;
export const getLangSetting = () => setting;
export const isRTL = () => current === 'ar';

/** Neu zeichnen, wenn sich die Sprache ändert */
export function useLang() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
  );
}

async function readStore(): Promise<string | null> {
  try {
    return Platform.OS === 'web' ? localStorage.getItem(STORE_KEY) : await SecureStore.getItemAsync(STORE_KEY);
  } catch {
    return null;
  }
}
async function writeStore(v: string) {
  try {
    if (Platform.OS === 'web') localStorage.setItem(STORE_KEY, v);
    else await SecureStore.setItemAsync(STORE_KEY, v);
  } catch {}
}

/** beim Start: gespeicherte Wahl laden */
export async function loadLang() {
  const v = await readStore();
  if (v === 'de' || v === 'en' || v === 'ar' || v === 'auto') setting = v;
  apply(setting === 'auto' ? deviceLang() : setting);
}

export async function setLangSetting(s: LangSetting) {
  setting = s;
  await writeStore(s);
  apply(s === 'auto' ? deviceLang() : s);
}

export function t(key: Key, params?: Record<string, string | number>) {
  let s = DICTS[current][key] ?? en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Text zu einem API-Fehler (nach `error`-Code); unbekannte Codes → allgemeiner Fehler (Server-Texte sind Englisch). */
export function errorText(e: unknown) {
  const code = (e as { code?: string })?.code;
  const key = `err.${code}` as Key;
  if (code && key in en) return t(key);
  const msg = (e as { message?: string })?.message;
  if (current === 'en' && msg && msg !== code) return msg;
  return t('err.server_error');
}

export const isKey = (k: string): k is Key => k in en;

/** Datum/Zahl im Format der Sprache */
export const locale = () => (current === 'de' ? 'de-DE' : current === 'ar' ? 'ar-u-nu-latn' : 'en-US');

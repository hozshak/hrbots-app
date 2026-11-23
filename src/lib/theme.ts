// Design wie die Webseite highrise-bots.com („Neon Grid“, worker/src/lib/theme.ts): dunkel, Neon-Cyan + Lime,
// Überschriften in „Syne“, Zahlen/Code in „DM Mono“, Fließtext = Systemschrift. Immer dunkel (die Webseite ist dunkel).
// Die Schrift-Stile (T) bekommen bei Arabisch Rechtsbündigkeit + Schreibrichtung + Systemschrift für Überschriften
// (Syne hat keine arabischen Zeichen) – gesetzt über setTextDirection() aus i18n.
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const C = {
  bg: '#070912',
  bg2: '#0b0f20',
  card: '#0b0f20', // --surface
  card2: '#0d1226', // --surface2
  elevated: '#121838',
  cardPressed: '#121838',
  cardBorder: '#1d2a55', // --border
  borderSoft: '#15203f',
  borderStrong: '#314a92',
  field: '#0d1226',
  fieldBorder: '#1d2a55',
  text: '#e8ecff',
  text2: '#a9b1d8', // zwischen --text und --muted: besser lesbar für kurze Sätze
  muted: '#8a93bf',
  text3: '#8a93bf', // --muted (gut lesbar auf dunkel)
  dim: '#5a6196',
  accent: '#2dd4ff', // Neon-Cyan
  accent2: '#b6ff3c', // Lime
  accentSoft: 'rgba(45,212,255,0.12)',
  accentBorder: 'rgba(45,212,255,0.45)',
  onAccent: '#04121a', // --accent-ink
  magenta: '#ff3df0',
  violet: '#9d5cff',
  gold: '#ffcc44',
  green: '#3df0a0', // --success
  greenSoft: 'rgba(61,240,160,0.12)',
  red: '#ff4d6d', // --danger
  redSoft: 'rgba(255,77,109,0.12)',
  orange: '#ff9a3d', // „Braucht Hilfe“
  orangeSoft: 'rgba(255,154,61,0.14)',
  yellow: '#ffcc44', // --warn
  yellowSoft: 'rgba(255,204,68,0.12)',
  gray: '#5a6196',
  separator: '#15203f',
  overlay: 'rgba(2,3,10,0.72)',
  white: '#ffffff',
  /** Hintergrund der Bot-Meldungen (wie ein Terminal) */
  logBg: '#000000',
  /** Meldungen oben (Toast) */
  toastBg: 'rgba(11,15,32,0.9)',
};

export const R = { xs: 6, sm: 8, md: 10, lg: 12, xl: 16, pill: 999 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Leuchten wie auf der Webseite (--glow): auf iOS als Schatten in Neon-Farbe */
export function glow(color: string = C.accent, strength = 0.45): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: { shadowColor: color, shadowOpacity: strength, shadowRadius: 9, shadowOffset: { width: 0, height: 0 } },
    web: { boxShadow: `0 0 18px ${hexA(color, strength)}` } as ViewStyle,
    default: {},
  })!;
}
/** Theme-Farbe mit Deckkraft (für Ränder/Flächen), z. B. alpha(C.gold, 0.45) */
export function alpha(hex: string, a: number) {
  return hexA(hex, a);
}
function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Schriften (geladen in app/_layout.tsx über @expo-google-fonts/syne und @expo-google-fonts/dm-mono)
export const FONT = { display: 'Syne_700Bold', displayHeavy: 'Syne_800ExtraBold', mono: 'DMMono_400Regular', monoMedium: 'DMMono_500Medium' };
const system = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", Tahoma, Arial, sans-serif',
  default: undefined,
});
const webStack = (f: string) => (Platform.OS === 'web' ? `${f}, ${system}` : f);
export const mono = webStack(FONT.mono);

type TS = TextStyle;
type Key = 'hero' | 'title' | 'headline' | 'body' | 'callout' | 'sub' | 'caption' | 'section' | 'big' | 'num';
// Überschriften: Syne OHNE fontWeight (eigene Schriftdatei je Stärke; fontWeight würde auf iOS die Systemschrift wählen)
const BASE: Record<Key, TS> = {
  hero: { fontFamily: webStack(FONT.displayHeavy), fontSize: 30, color: C.text, letterSpacing: -0.3 },
  title: { fontFamily: webStack(FONT.displayHeavy), fontSize: 24, color: C.text, letterSpacing: -0.2 },
  big: { fontFamily: webStack(FONT.display), fontSize: 20, color: C.text },
  headline: { fontFamily: webStack(FONT.display), fontSize: 18, color: C.text },
  body: { fontFamily: system, fontSize: 17, fontWeight: '400', color: C.text },
  callout: { fontFamily: system, fontSize: 16, fontWeight: '400', color: C.text2 },
  sub: { fontFamily: system, fontSize: 15, fontWeight: '500', color: C.text2 },
  caption: { fontFamily: system, fontSize: 13, fontWeight: '600', color: C.text3 },
  section: { fontFamily: system, fontSize: 13, fontWeight: '800', color: C.text3, letterSpacing: 1, textTransform: 'uppercase' },
  num: { fontFamily: webStack(FONT.monoMedium), fontSize: 16, color: C.text },
};
const DISPLAY: Key[] = ['hero', 'title', 'big', 'headline'];
const DISPLAY_WEIGHT: Partial<Record<Key, TS['fontWeight']>> = { hero: '800', title: '800', big: '700', headline: '700' };

export const T: Record<Key, TS> = { ...BASE };

/** Arabisch: alles rechtsbündig, von rechts nach links, Überschriften in Systemschrift (fett); sonst zurück. */
export function setTextDirection(rtl: boolean) {
  for (const k of Object.keys(BASE) as Key[]) {
    const base = BASE[k];
    const arabicDisplay = rtl && DISPLAY.includes(k) ? { fontFamily: system, fontWeight: DISPLAY_WEIGHT[k], letterSpacing: 0 } : null;
    T[k] = { ...base, ...arabicDisplay, ...(rtl && k === 'section' ? { letterSpacing: 0 } : null), textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' };
  }
}

// Farben je Bot-Art wie auf der Webseite: Welcome = Neon-Grün · Mod = Violett · Music = Cyan
export const KIND_COLOR: Record<string, string> = { welcome: '#3df0a0', mod: '#9d5cff', music: '#2dd4ff' };
export const KIND_EMOJI: Record<string, string> = { welcome: '👋', mod: '🛡️', music: '🎧' };
/** Farben der Kacheln im Bot-Menü – alle aus der Webseiten-Palette */
export const PAGE_TINT = {
  say: C.violet, helpers: C.green, watch: C.accent, rules: C.red, places: C.orange, look: C.magenta, music: C.magenta,
  tickets: C.gold, stand: C.accent, activity: C.text2, help: C.green, expert: C.text3,
} as const;
/** Haupt-Knöpfe: Verlauf Cyan → Lime (wie .btn-primary) */
export const PRIMARY_GRADIENT = ['#2dd4ff', '#b6ff3c'] as const;

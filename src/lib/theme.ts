// Farben, Abstände und Schrift. Dunkel, ein Akzent; Schrift = Systemschrift (auf dem iPhone SF Pro).
import { Platform } from 'react-native';

export const C = {
  bg: '#07080b',
  bg2: '#0d0f14',
  card: 'rgba(255,255,255,0.055)',
  cardSolid: '#14161d',
  cardBorder: 'rgba(255,255,255,0.08)',
  field: 'rgba(255,255,255,0.07)',
  fieldBorder: 'rgba(255,255,255,0.10)',
  text: '#f4f5f8',
  text2: 'rgba(235,237,245,0.64)',
  text3: 'rgba(235,237,245,0.38)',
  accent: '#6e7bff',
  accentSoft: 'rgba(110,123,255,0.16)',
  onAccent: '#ffffff',
  green: '#34d399',
  red: '#ff5f6d',
  redSoft: 'rgba(255,95,109,0.14)',
  yellow: '#fbbf24',
  gray: '#8a8f9c',
  separator: 'rgba(255,255,255,0.07)',
};

export const R = { sm: 10, md: 14, lg: 20, xl: 26 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

const family = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
  default: undefined,
});
export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' });

export const T = {
  largeTitle: { fontFamily: family, fontSize: 32, fontWeight: '700' as const, letterSpacing: 0.2, color: C.text },
  title: { fontFamily: family, fontSize: 22, fontWeight: '700' as const, color: C.text },
  headline: { fontFamily: family, fontSize: 17, fontWeight: '600' as const, color: C.text },
  body: { fontFamily: family, fontSize: 16, fontWeight: '400' as const, color: C.text },
  callout: { fontFamily: family, fontSize: 15, fontWeight: '400' as const, color: C.text2 },
  sub: { fontFamily: family, fontSize: 13, fontWeight: '400' as const, color: C.text2 },
  caption: { fontFamily: family, fontSize: 12, fontWeight: '500' as const, color: C.text3, letterSpacing: 0.3 },
  section: { fontFamily: family, fontSize: 13, fontWeight: '600' as const, color: C.text3, letterSpacing: 0.6, textTransform: 'uppercase' as const },
};

export const KIND_COLOR: Record<string, string> = { welcome: '#f5a524', mod: '#4fb3ff', music: '#e46cff' };
export const STATUS_COLOR: Record<string, string> = { running: C.green, stopped: C.gray, crashed: C.red };

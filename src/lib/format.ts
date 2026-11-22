// Anzeige von Laufzeit und Zeitangaben – neutral, ohne Preise oder Kauf-Hinweise (App-Store-Regel 3.1.3(f)).
import type { Bot } from '@/api';
import { lang, t } from './i18n';

/** verbleibende Sekunden jetzt; läuft der Bot, zählt die Zeit seit dem Abruf mit herunter */
export function secondsLeft(bot: Bot, nowMs = Date.now()) {
  const base = bot.runtime.seconds_left ?? 0;
  if (bot.status !== 'running' || !bot.received_at) return Math.max(0, base);
  return Math.max(0, base - Math.floor((nowMs - bot.received_at) / 1000));
}

export function runtimeValue(bot: Bot, nowMs = Date.now()) {
  if (bot.runtime.unlimited) return t('runtime.unlimited');
  const s = secondsLeft(bot, nowMs);
  if (s <= 0) return null;
  const totalMin = Math.max(1, Math.floor(s / 60));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return t('runtime.dh', { d, h });
  if (h > 0) return t('runtime.hm', { h, m });
  return t('runtime.m', { m });
}

/** „Runtime: 2 h 13 min“ · „Runtime: Unlimited“ · „No runtime left“ */
export function runtimeLine(bot: Bot, nowMs = Date.now()) {
  const v = runtimeValue(bot, nowMs);
  return v ? t('runtime.label', { value: v }) : t('runtime.none');
}

export function relTime(isoStr: string, nowMs = Date.now()) {
  const ms = Date.parse(isoStr.includes('T') ? isoStr : isoStr.replace(' ', 'T') + 'Z');
  if (!Number.isFinite(ms)) return isoStr;
  const min = Math.floor((nowMs - ms) / 60000);
  if (min < 1) return t('time.now');
  if (min < 60) return t('time.min', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('time.hour', { n: h });
  return t('time.day', { n: Math.floor(h / 24) });
}

export function shortDate(isoStr: string) {
  const ms = Date.parse(isoStr);
  if (!Number.isFinite(ms)) return isoStr;
  try {
    return new Date(ms).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

/** Laufzeit in Worten für Karten: „3 days left“, „2 h 13 min left“, „Unlimited“, „No runtime left“ */
export function runtimeWords(bot: Bot, nowMs = Date.now()) {
  if (bot.runtime.unlimited) return t('rt.unlimited');
  const s = secondsLeft(bot, nowMs);
  if (s <= 0) return t('rt.none');
  const totalMin = Math.max(1, Math.floor(s / 60));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d >= 2) return t('rt.days', { d });
  if (d === 1) return t('rt.day', { h });
  if (h > 0) return t('rt.hm', { h, m });
  return t('rt.m', { m });
}

export const hasRuntime = (bot: Bot, nowMs = Date.now()) => bot.runtime.unlimited || secondsLeft(bot, nowMs) > 0;

/** Status in einfachen Worten */
export function plainStatus(bot: Bot, pending: string | null) {
  if (pending === 'start') return t('state.starting');
  if (pending === 'stop') return t('state.stopping');
  if (pending === 'restart') return t('state.restarting');
  if (bot.status === 'running') return t('state.online');
  if (bot.status === 'crashed') return t('state.problem');
  return t('state.offline');
}

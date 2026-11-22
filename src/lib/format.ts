// Anzeige von Restzeit und Zeitangaben – neutral, ohne Preise oder Kauf-Hinweise (App-Store-Regel 3.1.3(f)).
import type { Bot } from '@/api';
import { locale, t } from './i18n';

/** verbleibende Sekunden jetzt; läuft der Bot, zählt die Zeit seit dem Abruf mit herunter */
export function secondsLeft(bot: Bot, nowMs = Date.now()) {
  const base = bot.runtime.seconds_left ?? 0;
  if (bot.status !== 'running' || !bot.received_at) return Math.max(0, base);
  return Math.max(0, base - Math.floor((nowMs - bot.received_at) / 1000));
}

export const hasRuntime = (bot: Bot, nowMs = Date.now()) => bot.runtime.unlimited || secondsLeft(bot, nowMs) > 0;

/** „noch 2 Std. 13 Min.“ · „Läuft immer“ · „Keine Zeit mehr“ */
export function timeLeftWords(bot: Bot, nowMs = Date.now()) {
  if (bot.runtime.unlimited) return t('time.unlimited');
  const s = secondsLeft(bot, nowMs);
  if (s <= 0) return t('time.none');
  const totalMin = Math.max(1, Math.floor(s / 60));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const v = d >= 2 ? t('time.d', { d }) : d === 1 ? t('time.d1', { h }) : h > 0 ? t('time.hm', { h, m }) : t('time.m', { m });
  return t('time.left', { t: v });
}

/** Füllstand für den kleinen Balken: 1 Tag oder mehr = voll */
export function timeFraction(bot: Bot, nowMs = Date.now()) {
  if (bot.runtime.unlimited) return 1;
  return Math.max(0, Math.min(1, secondsLeft(bot, nowMs) / 86400));
}

export function parseIso(isoStr: string | null | undefined) {
  if (!isoStr) return NaN;
  return Date.parse(isoStr.includes('T') ? isoStr : isoStr.replace(' ', 'T') + 'Z');
}

export function relTime(isoStr: string | null | undefined, nowMs = Date.now()) {
  const ms = parseIso(isoStr);
  if (!Number.isFinite(ms)) return '';
  const min = Math.floor((nowMs - ms) / 60000);
  if (min < 1) return t('ago.now');
  if (min < 60) return t('ago.min', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('ago.h', { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t('ago.d1') : t('ago.d', { n: d });
}

export function shortDate(isoStr: string | null | undefined) {
  const ms = parseIso(isoStr);
  if (!Number.isFinite(ms)) return '';
  try {
    return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

export function fmtNum(n: number) {
  try {
    return n.toLocaleString(locale());
  } catch {
    return String(n);
  }
}

export function fileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

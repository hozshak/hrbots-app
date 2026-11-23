// Welche Kacheln (Seiten) jede Bot-Art im Bot-Menü hat – kurz, je eine Aufgabe. „Experten-Einstellungen“ kommt extra.
import type { BotDetail, BotKind, Facing, ModSettings, MusicSettings, WelcomeSettings } from '@/api';
import { t, type Key } from '@/lib/i18n';
import { PAGE_TINT } from '@/lib/theme';

export type PageKey = 'say' | 'helpers' | 'watch' | 'rules' | 'places' | 'look' | 'music' | 'tickets' | 'stand' | 'activity' | 'help' | 'expert';

export const PAGES: Record<BotKind, PageKey[]> = {
  welcome: ['say', 'helpers', 'watch', 'stand', 'activity', 'help'],
  mod: ['say', 'helpers', 'rules', 'places', 'look', 'stand', 'activity', 'help'],
  music: ['music', 'say', 'helpers', 'tickets', 'stand', 'activity', 'help'],
};

export const PAGE_EMOJI: Record<PageKey, string> = {
  say: '💬', helpers: '🧑‍🤝‍🧑', watch: '👀', rules: '🚫', places: '🚪', look: '👕', music: '🎵', tickets: '🎟️',
  stand: '📍', activity: '📋', help: '❓', expert: '🧰',
};

export const PAGE_COLOR: Record<PageKey, string> = PAGE_TINT;

/** Pfeil der Blickrichtung (wie im Highrise-Raum von oben gesehen) */
export const FACING_ARROW: Record<Facing, string> = { BackLeft: '↖', BackRight: '↗', FrontLeft: '↙', FrontRight: '↘' };

export const pageTitle = (p: PageKey) => t(`page.${p}` as Key);

export const isPage = (kind: BotKind, p: string): p is PageKey => p === 'expert' || (PAGES[kind] as string[]).includes(p);

/** kleine Zeile unter der Kachel, z. B. „3 Nachrichten“ */
export function pageSub(d: BotDetail, p: PageKey): string | null {
  const n = (k: Key, count: number) => (count === 1 ? t(`${k}1` as Key) : t(k, { n: count }));
  // „Wo er steht“: Blickrichtung als Pfeil + Wort
  if (p === 'stand') {
    const f = d.settings.position.facing;
    return `${FACING_ARROW[f]} ${t(`facing.${f}` as Key)}`;
  }
  if (d.bot.kind === 'welcome') {
    const s = d.settings as WelcomeSettings;
    if (p === 'say') return n('count.messages', s.messages.length);
    if (p === 'helpers') return n('count.people', s.admins.length);
    if (p === 'watch') return n('count.people', s.tracking?.length ?? 0);
  }
  if (d.bot.kind === 'mod') {
    const s = d.settings as ModSettings;
    if (p === 'say') return n('count.messages', s.welcomes.length);
    if (p === 'helpers') return n('count.people', s.roles.admin.length + s.roles.moderator.length + s.roles.vip.length + (s.owner_username ? 1 : 0));
    if (p === 'rules') return n('count.words', s.banned_words.length);
    if (p === 'places') return n('count.places', s.destinations.length + (s.vip?.zones.length ?? 0));
    if (p === 'look') return s.outfits ? n('count.outfits', s.outfits.list.length) : null;
  }
  if (d.bot.kind === 'music') {
    const s = d.settings as MusicSettings;
    if (p === 'say') return n('count.lines', s.announcements.lines.length);
    if (p === 'helpers') return n('count.people', s.roles.mod.length + s.roles.dj.length + s.roles.vip.length + (s.owner_username ? 1 : 0));
    if (p === 'music') return d.bot.status === 'running' ? t('music.ready') : t('music.sleeping');
  }
  return null;
}

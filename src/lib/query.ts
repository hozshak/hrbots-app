// Daten-Cache (TanStack Query) und Start/Stopp mit sofortiger Anzeige + kurzem Nachfragen beim Server.
import { useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { ApiError, bots, type Bot, type BotDetail, type BotKind, type BotStatus, type PowerAction } from '@/api';
import { haptic } from './ui';
import { errorText } from './i18n';
import { toast } from './toast';
import { openFixIt } from './fixit';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

export const keys = {
  me: ['me'] as const,
  bots: ['bots'] as const,
  bot: (kind: BotKind, id: number) => ['bot', kind, id] as const,
  logs: (kind: BotKind, id: number) => ['logs', kind, id] as const,
  presence: (kind: BotKind, id: number) => ['presence', kind, id] as const,
  extra: (what: string, kind: BotKind, id: number) => ['extra', what, kind, id] as const,
  wallet: ['wallet'] as const,
  link: ['link'] as const,
  radios: ['radios'] as const,
  tickets: ['tickets'] as const,
  ticket: (id: number) => ['ticket', id] as const,
};

export const useBots = () => useQuery({ queryKey: keys.bots, queryFn: bots.list });
export const useBot = (kind: BotKind, id: number) => useQuery({ queryKey: keys.bot(kind, id), queryFn: () => bots.get(kind, id) });

/** Bot-Objekt in Liste und Detail-Cache ersetzen/ändern */
export function patchBotCache(kind: BotKind, id: number, fn: (b: Bot) => Bot) {
  queryClient.setQueryData<Bot[]>(keys.bots, (list) => list?.map((b) => (b.kind === kind && b.id === id ? fn(b) : b)));
  queryClient.setQueryData<BotDetail>(keys.bot(kind, id), (d) => (d ? ({ ...d, bot: fn(d.bot) } as BotDetail) : d));
}
export function putBot(bot: Bot) {
  patchBotCache(bot.kind, bot.id, () => bot);
}

// ---- Start / Stopp / Neustart ----
// Ablauf: Status sofort umstellen (optimistisch) → Server-Aufruf → alle 2 s den echten Status holen, höchstens ~10 s,
// bis er passt. Fehler → alter Stand zurück und Meldung (z. B. „Keine Laufzeit übrig“, „Server nicht erreichbar“).
const pendingStore = new Map<string, PowerAction>();
const pendingSubs = new Set<() => void>();
const pkey = (kind: BotKind, id: number) => `${kind}:${id}`;
function setPending(k: string, a: PowerAction | null) {
  if (a) pendingStore.set(k, a);
  else pendingStore.delete(k);
  pendingSubs.forEach((f) => f());
}

export function usePending(kind: BotKind, id: number) {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    pendingSubs.add(f);
    return () => {
      pendingSubs.delete(f);
    };
  }, []);
  return pendingStore.get(pkey(kind, id)) ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function powerBot(bot: Bot, action: PowerAction) {
  const k = pkey(bot.kind, bot.id);
  if (pendingStore.has(k)) return;
  const target: BotStatus = action === 'stop' ? 'stopped' : 'running';
  const before = queryClient.getQueryData<Bot[]>(keys.bots)?.find((b) => b.kind === bot.kind && b.id === bot.id) ?? bot;
  haptic.medium();
  setPending(k, action);
  patchBotCache(bot.kind, bot.id, (b) => ({ ...b, status: target }));
  try {
    await bots.power(bot.kind, bot.id, action);
  } catch (e) {
    patchBotCache(bot.kind, bot.id, () => before);
    setPending(k, null);
    haptic.error();
    // Bot-Server antwortet nicht → Beheben-Blatt mit „Erneut versuchen“; sonst kurze Meldung (z. B. keine Laufzeit)
    if (e instanceof ApiError && e.code === 'agent_unreachable') openFixIt(before, 'agent');
    else toast(errorText(e), 'error');
    return;
  }
  // kurz beim Server nachfragen, bis der Agent den neuen Status meldet (Restart: erst aus, dann an)
  let latest: Bot | null = null;
  for (let i = 0; i < 5; i++) {
    await sleep(2000);
    try {
      const d = await bots.get(bot.kind, bot.id);
      latest = d.bot;
      queryClient.setQueryData(keys.bot(bot.kind, bot.id), d);
      if (d.bot.status === target) break;
      // abgestürzt (nicht nur der alte Stand vom ersten Abruf) → nicht weiter warten
      if (target === 'running' && d.bot.status === 'crashed' && i >= 1) break;
    } catch {
      /* nächster Versuch */
    }
  }
  if (latest) putBot(latest);
  setPending(k, null);
  if (latest?.status === target) haptic.success();
  else {
    queryClient.invalidateQueries({ queryKey: keys.bots });
    // Start hat nicht geklappt (abgestürzt oder offline geblieben) → Hilfe anbieten
    if (target === 'running' && latest && latest.status !== 'running') {
      haptic.error();
      openFixIt(latest, 'crashed');
    }
  }
}

/** Sekündlicher/halbminütlicher Takt, damit die Restzeit sichtbar herunterzählt */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Ziehen-zum-Aktualisieren ohne das Lade-Rädchen bei Hintergrund-Abrufen */
export function usePullRefresh(fn: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const onRefresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      await fn();
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, [fn]);
  return { refreshing, onRefresh };
}

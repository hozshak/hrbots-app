// Bot aus den Seiten-Parametern (/bot/[kind]/[id]/…) laden.
import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ApiError, BOT_KINDS, type BotKind } from '@/api';
import { keys, queryClient, useBot, usePullRefresh } from '@/lib/query';

export function useBotParams() {
  const p = useLocalSearchParams<{ kind: string; id: string; page?: string }>();
  const kind = (BOT_KINDS.includes(p.kind as BotKind) ? p.kind : 'welcome') as BotKind;
  return { kind, id: Number(p.id), page: p.page ?? '' };
}

export function useBotPage() {
  const { kind, id, page } = useBotParams();
  const q = useBot(kind, id);
  const notFound = q.error instanceof ApiError && q.error.code === 'not_found';
  const { refreshing, onRefresh } = usePullRefresh(
    useCallback(() => Promise.all([q.refetch(), queryClient.invalidateQueries({ queryKey: ['extra'] }), queryClient.invalidateQueries({ queryKey: keys.presence(kind, id) })]), [q.refetch, kind, id]),
  );
  return { kind, id, page, q, d: q.data, notFound, refreshing, onRefresh };
}

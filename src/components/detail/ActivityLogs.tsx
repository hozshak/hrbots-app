// Aktivität (wer kam/ging) und Logs (Monospace, ERROR rot, WARNING gelb).
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bots, type BotKind } from '@/api';
import { keys, useNow } from '@/lib/query';
import { relTime } from '@/lib/format';
import { errorText, t } from '@/lib/i18n';
import { C, mono, S, T } from '@/lib/theme';
import { ErrorBox } from '../ui';
import { ActivityIndicator } from 'react-native';

export function usePresence(kind: BotKind, id: number, active: boolean) {
  return useQuery({ queryKey: keys.presence(kind, id), queryFn: () => bots.presence(kind, id), enabled: active, refetchInterval: active ? 15000 : false });
}
export function useLogs(kind: BotKind, id: number, active: boolean, running: boolean) {
  return useQuery({ queryKey: keys.logs(kind, id), queryFn: () => bots.logs(kind, id), enabled: active, refetchInterval: active && running ? 5000 : false });
}

export function Activity({ kind, id }: { kind: BotKind; id: number }) {
  const q = usePresence(kind, id, true);
  const now = useNow(30000);
  if (q.isLoading) return <ActivityIndicator color={C.accent} style={{ marginVertical: 12 }} />;
  if (q.error) return <ErrorBox text={errorText(q.error)} onRetry={() => q.refetch()} retryLabel={t('common.retry')} />;
  const events = q.data ?? [];
  if (!events.length) return <Text style={[T.callout, { textAlign: 'center', marginVertical: 12 }]}>{t('activity.empty')}</Text>;
  return (
    <View>
      {events.slice(0, 30).map((e, i) => {
        const join = e.event === 'join' || e.event === 'enter';
        return (
          <View key={`${e.created_at}-${e.username}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 48, borderBottomWidth: i < events.length - 1 ? 0.5 : 0, borderBottomColor: C.separator }}>
            <Ionicons name={join ? 'enter-outline' : 'exit-outline'} size={20} color={join ? C.green : C.text3} />
            <Text style={[T.body, { flex: 1 }]} numberOfLines={1}>
              <Text style={{ fontWeight: '600' }}>@{e.username}</Text>
              <Text style={{ color: C.text2 }}> {join ? t('activity.join') : e.event === 'leave' ? t('activity.leave') : e.event}</Text>
            </Text>
            <Text style={T.caption}>{relTime(e.created_at, now)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function lineColor(l: string) {
  if (/\bERROR\b|\bCRITICAL\b|\bFATAL\b/i.test(l)) return C.red;
  if (/\bWARN(ING)?\b/i.test(l)) return C.yellow;
  return C.text2;
}

export function Logs({ kind, id, running }: { kind: BotKind; id: number; running: boolean }) {
  const q = useLogs(kind, id, true, running);
  if (q.isLoading) return <ActivityIndicator color={C.accent} style={{ marginVertical: 12 }} />;
  if (q.error) return <ErrorBox text={errorText(q.error)} onRetry={() => q.refetch()} retryLabel={t('common.retry')} />;
  const lines = [...(q.data ?? [])].reverse();
  if (!lines.length) return <Text style={[T.callout, { textAlign: 'center', marginVertical: 12 }]}>{t('logs.empty')}</Text>;
  return (
    <View style={{ gap: S.sm }}>
      <Text style={[T.caption, { paddingHorizontal: 4 }]}>{t('logs.newest')}</Text>
      <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 12, padding: S.md }}>
        <View style={{ gap: 6 }}>
          {lines.map((l, i) => (
            <Text key={i} selectable style={{ fontFamily: mono, fontSize: 11.5, lineHeight: 16, color: lineColor(l) }}>{l}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

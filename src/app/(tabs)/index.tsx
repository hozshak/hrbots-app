// Start: große Bot-Karten (Gesicht, Name, AN/AUS-Knopf, Restzeit). Oben rechts „+ Neu“ – immer unter der Statusleiste.
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { BOT_KINDS, type BotKind } from '@/api';
import { queryClient, keys, useBots, useNow, usePullRefresh } from '@/lib/query';
import { t } from '@/lib/i18n';
import { Button, Empty, ErrorState, Face, Loading, Screen, Tabs, Txt } from '@/components/ui';
import { BotCard } from '@/components/BotCard';
import { C, KIND_COLOR, KIND_EMOJI, S, T } from '@/lib/theme';

export default function Home() {
  const router = useRouter();
  const q = useBots();
  const now = useNow(30000);
  const { refreshing, onRefresh } = usePullRefresh(useCallback(() => q.refetch(), [q.refetch]));

  // beim Zurückkehren still neu laden
  useFocusEffect(useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.bots });
  }, []));
  // solange etwas läuft, die Restzeit gelegentlich vom Server holen
  useEffect(() => {
    const id = setInterval(() => {
      if (q.data?.some((b) => b.status === 'running')) queryClient.invalidateQueries({ queryKey: keys.bots });
    }, 60000);
    return () => clearInterval(id);
  }, [q.data]);

  const order = (k: string) => BOT_KINDS.indexOf(k as never);
  const data = [...(q.data ?? [])].sort((a, b) => order(a.kind) - order(b.kind) || a.name.localeCompare(b.name));
  const create = () => router.push('/new');
  // wie das Dashboard der Webseite: „X von Y an“ und Filter je Art (nur wenn es mehrere Arten gibt)
  const [filter, setFilter] = useState<'all' | BotKind>('all');
  const kinds = BOT_KINDS.filter((k) => data.some((b) => b.kind === k));
  const shown = filter === 'all' || kinds.length < 2 ? data : data.filter((b) => b.kind === filter);
  const on = data.filter((b) => b.status === 'running').length;

  return (
    <Screen
      tab
      title={t('home.title')}
      right={data.length ? <Button testID="add-bot" label={t('home.new')} icon="add" small onPress={create} /> : null}
      onRefresh={onRefresh}
      refreshing={refreshing}
      testID="home"
    >
      {q.isLoading ? (
        <Loading />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !data.length ? (
        <View style={{ gap: S.lg, paddingTop: S.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: S.md }}>
            {BOT_KINDS.map((k) => <Face key={k} emoji={KIND_EMOJI[k]} color={KIND_COLOR[k]} size={72} />)}
          </View>
          <Empty testID="home-empty" emoji="🤖" title={t('home.emptyTitle')} text={t('home.emptyText')} action={t('home.emptyBtn')} onAction={create} />
        </View>
      ) : (
        <>
          <Txt style={[T.sub, { color: on ? C.green : C.text2, fontWeight: '700' }]} testID="home-on">{on ? '🟢' : '⚪'} {t('home.onCount', { on, all: data.length })}</Txt>
          {kinds.length > 1 ? (
            <Tabs<'all' | BotKind>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('home.all'), count: data.length },
                ...kinds.map((k) => ({ value: k, emoji: KIND_EMOJI[k], label: t(`kind.${k}`), count: data.filter((b) => b.kind === k).length })),
              ]}
            />
          ) : null}
          {shown.length ? shown.map((b, i) => <BotCard key={`${b.kind}:${b.id}`} bot={b} now={now} index={i} />) : <Empty emoji="🔎" title={t('home.filterEmpty')} />}
        </>
      )}
    </Screen>
  );
}

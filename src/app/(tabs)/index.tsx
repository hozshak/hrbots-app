// Reiter „Bots“: eine große Karte pro Bot mit Schalter; „+“ startet den geführten Assistenten.
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MOCK, BOT_KINDS } from '@/api';
import { queryClient, keys, useBots, useNow, usePullRefresh } from '@/lib/query';
import { errorText, t } from '@/lib/i18n';
import { C, S, T } from '@/lib/theme';
import { Backdrop, Button, ErrorBox, Glass, IconButton, KindIcon, ScreenTitle } from '@/components/ui';
import { BotCard } from '@/components/BotCard';

function EmptyCard({ onCreate }: { onCreate: () => void }) {
  return (
    <Glass style={{ marginTop: S.sm }}>
      <View style={{ alignItems: 'center', gap: S.lg, paddingVertical: S.lg }}>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {BOT_KINDS.map((k) => <KindIcon key={k} kind={k} size={48} />)}
        </View>
        <Text style={[T.title, { textAlign: 'center' }]}>{t('bots.emptyTitle')}</Text>
        <Text style={[T.callout, { textAlign: 'center', lineHeight: 22 }]}>{t('bots.emptyText')}</Text>
        <Button testID="empty-create" label={t('bots.emptyButton')} icon="add" onPress={onCreate} style={{ alignSelf: 'stretch' }} />
      </View>
    </Glass>
  );
}

export default function Bots() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = useBots();
  const now = useNow(30000);
  const { refreshing, onRefresh } = usePullRefresh(useCallback(() => q.refetch(), [q.refetch]));

  // beim Zurückkehren still neu laden
  useFocusEffect(useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.bots });
  }, []));
  // solange etwas läuft, die Laufzeit gelegentlich vom Server holen
  useEffect(() => {
    const id = setInterval(() => {
      if (q.data?.some((b) => b.status === 'running')) queryClient.invalidateQueries({ queryKey: keys.bots });
    }, 60000);
    return () => clearInterval(id);
  }, [q.data]);

  const order = (k: string) => BOT_KINDS.indexOf(k as never);
  const data = [...(q.data ?? [])].sort((a, b) => order(a.kind) - order(b.kind) || a.name.localeCompare(b.name));
  const create = () => router.push('/new');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <FlatList
        data={data}
        keyExtractor={(b) => `${b.kind}:${b.id}`}
        contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + 100, gap: S.md, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text2} />}
        ListHeaderComponent={
          <View style={{ gap: S.md }}>
            <ScreenTitle
              title={t('bots.title')}
              right={data.length ? <IconButton testID="add-bot" icon="add" label={t('bots.add')} color={C.onAccent} bg={C.accent} size={44} onPress={create} /> : null}
            />
            {MOCK ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flask-outline" size={14} color={C.yellow} />
                <Text style={[T.caption, { color: C.yellow }]}>{t('common.demo')}</Text>
              </View>
            ) : null}
            {q.error && !q.data ? <ErrorBox text={errorText(q.error)} onRetry={() => q.refetch()} retryLabel={t('common.retry')} /> : null}
          </View>
        }
        ListEmptyComponent={
          q.isLoading ? <ActivityIndicator color={C.accent} style={{ marginTop: 60 }} /> : q.data ? <EmptyCard onCreate={create} /> : undefined
        }
        renderItem={({ item, index }) => <BotCard bot={item} now={now} index={index} />}
      />
    </View>
  );
}

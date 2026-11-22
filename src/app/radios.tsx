// Meine Radios: eigene Radiosender ansehen (läuft gerade? Zuhörer), Hör-Link kopieren, mit einem DJ-Bot verbinden,
// abgelaufene löschen. KEIN Kaufen/Verlängern (App-Store-Regel 3.1.3(f)).
import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { radio, type RadioStation } from '@/api';
import { keys, queryClient, useBots, usePullRefresh } from '@/lib/query';
import { shortDate } from '@/lib/format';
import { errorText, t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, S, T } from '@/lib/theme';
import { Button, Card, Choice, CodeChip, Empty, ErrorState, Loading, Screen, Txt } from '@/components/ui';
import { Expandable } from '@/components/guide';
import { askDelete } from '@/components/editors';

function Station({ st }: { st: RadioStation }) {
  const status = useQuery({ queryKey: ['radio-status', st.id], queryFn: () => radio.status(st.id), placeholderData: st.status, refetchInterval: 15000, enabled: st.active });
  const musicBots = (useBots().data ?? []).filter((b) => b.kind === 'music');
  const [pick, setPick] = useState<number | null>(st.last_synced_bot_id);
  const [busy, setBusy] = useState(false);
  const live = !!status.data?.live;
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      haptic.success();
      toast(ok, 'success');
      await queryClient.invalidateQueries({ queryKey: keys.radios });
    } catch (e) {
      haptic.error();
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card tone={live ? 'good' : undefined} style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Txt style={{ fontSize: 36 }} maxFontSizeMultiplier={1.2}>📻</Txt>
        <View style={{ flex: 1 }}>
          <Txt style={T.big} numberOfLines={2}>{st.name || st.mount}</Txt>
          <Txt style={[T.sub, { color: !st.active ? C.text3 : live ? C.green : C.text2, fontWeight: '700' }]}>
            {!st.active ? `⏸️ ${t('radio.stopped')}` : live ? `🔴 ${t('radio.live')}${status.data?.listeners != null ? ` · ${t('radio.listeners', { n: status.data.listeners })}` : ''}` : `💤 ${t('radio.quiet')}`}
          </Txt>
        </View>
      </View>
      <Txt style={T.sub}>
        {st.bundled_bot_id ? t('radio.withBot') : st.expires_at && !st.unlimited ? (st.active ? t('radio.until', { date: shortDate(st.expires_at) }) : t('radio.ended', { date: shortDate(st.expires_at) })) : t('radio.always')}
      </Txt>
      <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>🎧 {t('radio.listenLink')}</Txt>
      <CodeChip text={st.stream_url} />
      <Button label={t('common.copy')} small variant="secondary" emoji="📋" onPress={async () => { await Clipboard.setStringAsync(st.stream_url); toast(t('common.copied'), 'success'); }} />
      {st.active && musicBots.length ? (
        <Expandable title={t('radio.connect')} emoji="🔌">
          <View style={{ gap: S.sm }}>
            <Txt style={T.sub}>{t('radio.connectSub')}</Txt>
            <Choice<number> value={pick} onChange={setPick} options={musicBots.map((b) => ({ value: b.id, label: b.name, emoji: '🎧' }))} />
            <Button label={t('radio.connectBtn')} small disabled={!pick} loading={busy} onPress={() => pick && act(() => radio.sync(st.id, pick), t('radio.connected'))} />
          </View>
        </Expandable>
      ) : null}
      <Expandable title={t('radio.details')} emoji="🧰">
        <View style={{ gap: S.sm }}>
          <Txt style={T.sub}>{t('radio.detailsSub')}</Txt>
          <CodeChip text={`${st.source.host}:${st.source.port}`} />
          <CodeChip text={`/${st.mount}`} />
          <CodeChip text={st.source.user} />
          <Txt style={T.caption}>{st.source.password_set ? t('radio.passwordSet') : ''}</Txt>
        </View>
      </Expandable>
      {st.deletable && !st.bundled_bot_id ? (
        <Button label={t('radio.delete')} small variant="danger" emoji="🗑️" loading={busy}
          onPress={async () => { if (await askDelete(st.name || st.mount)) act(() => radio.remove(st.id), t('radio.deleted')); }} />
      ) : null}
    </Card>
  );
}

export default function Radios() {
  const q = useQuery({ queryKey: keys.radios, queryFn: radio.list });
  const { refreshing, onRefresh } = usePullRefresh(() => q.refetch());
  return (
    <Screen back title={`📻 ${t('account.radios')}`} onRefresh={onRefresh} refreshing={refreshing} testID="radios">
      <Txt style={T.callout}>{t('radio.sub')}</Txt>
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !(q.data ?? []).length ? (
        <Empty emoji="📻" title={t('radio.empty')} text={t('radio.emptyText')} />
      ) : (
        (q.data ?? []).map((st) => <Station key={st.id} st={st} />)
      )}
    </Screen>
  );
}

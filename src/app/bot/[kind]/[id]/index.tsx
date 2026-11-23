// Bot-Seite: oben der Bot (Gesicht, AN/AUS, Restzeit), darunter wenige große Kacheln – jede öffnet EINE Aufgabe.
// Alles Technische liegt hinter der abgesetzten Kachel „Experten-Einstellungen“.
import { View } from 'react-native';
import { router } from 'expo-router';
import { useNow, usePending } from '@/lib/query';
import { t } from '@/lib/i18n';
import { openFixIt } from '@/lib/fixit';
import { openRoom } from '@/lib/ui';
import { C, KIND_COLOR, KIND_EMOJI, S, T } from '@/lib/theme';
import { Button, Card, Empty, ErrorState, Face, goBack, Loading, Note, Screen, SectionTitle, Tile, Txt } from '@/components/ui';
import { PowerButton, powerLook, TimeLeft } from '@/components/BotCard';
import { PAGE_COLOR, PAGE_EMOJI, PAGES, pageSub, pageTitle, type PageKey } from '@/components/pages/meta';
import { useBotPage } from '@/components/pages/useBotPage';
import { BotGoldTile } from '@/components/BotGold';
import type { Bot } from '@/api';

function Hero({ bot }: { bot: Bot }) {
  const now = useNow(30000);
  const pending = usePending(bot.kind, bot.id);
  const look = powerLook(bot, pending);
  return (
    <Card tone={look === 'help' ? 'warn' : undefined} style={{ gap: S.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Face emoji={KIND_EMOJI[bot.kind]} color={KIND_COLOR[bot.kind]} size={76} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt auto style={[T.title, { fontSize: 24 }]} numberOfLines={2}>{bot.name}</Txt>
          <Txt style={[T.sub, { color: KIND_COLOR[bot.kind] }]}>{t(`kind.${bot.kind}`)} · {t(`kind.${bot.kind}.d`)}</Txt>
        </View>
      </View>
      <TimeLeft bot={bot} now={now} />
      <PowerButton bot={bot} testID="detail-power" />
      {look === 'help' ? <Button testID="detail-fix" label={t('bot.fixIt')} emoji="🛠️" variant="warning" onPress={() => openFixIt(bot, 'crashed')} /> : null}
      {/* wie „Open room“ auf der Webseite: gespeicherter Raum-Link, sonst high.rs/room?id=… */}
      <Button testID="detail-room" label={t('bot.openRoom')} emoji="🚪" variant="secondary" small onPress={() => openRoom(bot.room_url || `https://high.rs/room?id=${bot.room_id}`)} />
    </Card>
  );
}

export default function BotMenu() {
  const { kind, id, d, q, notFound, refreshing, onRefresh } = useBotPage();
  const open = (p: PageKey) => router.push({ pathname: '/bot/[kind]/[id]/[page]', params: { kind, id: String(id), page: p } });
  return (
    <Screen back onRefresh={onRefresh} refreshing={refreshing} testID="bot-menu">
      {q.isLoading ? (
        <Loading />
      ) : notFound ? (
        <Empty emoji="🤷" title={t('bot.notFound')} action={t('common.back')} actionIcon="back" onAction={() => goBack()} />
      ) : !d ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <Hero bot={d.bot} />
          {/* eigenes Gold des Bots in Highrise – nur Anzeige */}
          <BotGoldTile d={d} />
          {!d.bot.bot_token_set ? <Note emoji="🔑" tone="warn" text={t('bot.noKey')} /> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
            {PAGES[kind].map((p) => (
              <Tile key={p} testID={`tile-${p}`} emoji={PAGE_EMOJI[p]} label={pageTitle(p)} sub={pageSub(d, p)} color={PAGE_COLOR[p]} onPress={() => open(p)} />
            ))}
          </View>
          <SectionTitle title={t('bot.forGrownUps')} />
          <Tile testID="tile-expert" wide emoji={PAGE_EMOJI.expert} label={pageTitle('expert')} sub={t('page.expert.d')} color={C.text3} onPress={() => open('expert')} />
        </>
      )}
    </Screen>
  );
}

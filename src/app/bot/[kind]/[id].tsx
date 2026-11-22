// Bot-Seite: oben Statuskarte mit großem Schalter und Laufzeit; darunter klar benannte Abschnitte (aufklappbar,
// je ein Satz Erklärung); seltene Dinge unter „Erweitert“; Löschen ganz unten.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ApiError, bots, BOT_KINDS, type Bot, type BotDetail, type BotKind, type ModSettings as MS, type MusicSettings as MuS, type WelcomeSettings as WS,
} from '@/api';
import { keys, powerBot, queryClient, useBot, useNow, usePending, usePullRefresh } from '@/lib/query';
import { hasRuntime, plainStatus, runtimeWords, shortDate } from '@/lib/format';
import { openFixIt } from '@/lib/fixit';
import { errorText, t, type Key } from '@/lib/i18n';
import { confirm, haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, R, S, T } from '@/lib/theme';
import { Backdrop, Button, Empty, ErrorBox, Glass, KindIcon, StatusDot, type IconName } from '@/components/ui';
import { PowerSwitch, statusColor } from '@/components/BotCard';
import { animateLayout } from '@/components/guide';
import { CommandList } from '@/components/CommandList';
import { KeyEditor, NameRoomEditor, PositionEditor } from '@/components/detail/GeneralSettings';
import { WelcomeAdminsEditor, WelcomeMessagesEditor } from '@/components/detail/WelcomeSettings';
import { BannedWordsEditor, DestinationsEditor, ModRolesEditor, ModWelcomesEditor } from '@/components/detail/ModSettings';
import { AnnouncementsEditor, LiveControls, MusicRolesEditor, PlaybackEditor } from '@/components/detail/MusicSettings';
import { Activity, Logs } from '@/components/detail/ActivityLogs';

type Sec = { key: string; icon: IconName; title: Key; desc: Key; body: ReactNode };

function StatusCard({ bot }: { bot: Bot }) {
  const pending = usePending(bot.kind, bot.id);
  const now = useNow(30000);
  const problem = bot.status === 'crashed' && !pending;
  const noTime = !hasRuntime(bot, now);
  return (
    <Glass style={problem ? { borderColor: 'rgba(255,95,109,0.5)', borderWidth: 1 } : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <KindIcon kind={bot.kind} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={T.title} numberOfLines={1}>{bot.name}</Text>
          <Text style={T.sub}>{t(`kind.${bot.kind}`)}</Text>
        </View>
        <PowerSwitch bot={bot} />
      </View>
      <View style={{ height: 0.5, backgroundColor: C.separator, marginVertical: S.md }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -4 }}>
        <StatusDot status={bot.status} pending={!!pending} />
        <Text testID="detail-status" style={[T.headline, { color: statusColor(bot, pending), marginLeft: 2, flex: 1 }]}>{plainStatus(bot, pending)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Ionicons name={bot.runtime.unlimited ? 'infinite' : 'time-outline'} size={16} color={noTime ? C.yellow : C.text2} />
        <Text style={[T.callout, noTime ? { color: C.yellow } : null]}>{runtimeWords(bot, now)}</Text>
      </View>
      {problem ? (
        <View style={{ marginTop: S.md, gap: S.sm }}>
          <Text style={[T.callout, { color: C.text }]}>{t('bot.problemHint')}</Text>
          <Button testID="detail-fix" label={t('bot.fix')} icon="construct" onPress={() => openFixIt(bot, 'crashed')} />
        </View>
      ) : null}
    </Glass>
  );
}

function SectionRow({ sec, open, onToggle, onLayoutY }: { sec: Sec; open: boolean; onToggle: () => void; onLayoutY?: (y: number) => void }) {
  return (
    <View onLayout={onLayoutY ? (e) => onLayoutY(e.nativeEvent.layout.y) : undefined}>
    <Glass padded={false}>
      <Pressable
        testID={`sec-${sec.key}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={t(sec.desc)}
        onPress={onToggle}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, paddingLeft: S.lg, minHeight: 68, opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={sec.icon} size={21} color={C.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={T.headline}>{t(sec.title)}</Text>
          <Text style={T.sub}>{t(sec.desc)}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={C.text3} />
      </Pressable>
      {open ? <View style={{ paddingHorizontal: S.lg, paddingBottom: S.lg }}>{sec.body}</View> : null}
    </Glass>
    </View>
  );
}

/** onInitialY: Lage (in der Liste) des Abschnitts, der beim Öffnen per Link aufgeklappt wird – zum Hinscrollen */
function Accordion({ secs, initial, onInitialY }: { secs: Sec[]; initial?: string | null; onInitialY?: (y: number) => void }) {
  const [open, setOpen] = useState<string | null>(initial ?? null);
  useEffect(() => {
    if (initial) setOpen(initial);
  }, [initial]);
  return (
    <View style={{ gap: S.sm }}>
      {secs.map((s) => (
        <SectionRow
          key={s.key}
          sec={s}
          onLayoutY={s.key === initial ? onInitialY : undefined}
          open={open === s.key}
          onToggle={() => {
            haptic.select();
            animateLayout();
            setOpen((o) => (o === s.key ? null : s.key));
          }}
        />
      ))}
    </View>
  );
}

function kindSections(d: BotDetail): Sec[] {
  const id = d.bot.id;
  if (d.bot.kind === 'welcome') {
    const s = d.settings as WS;
    return [
      { key: 'messages', icon: 'chatbubbles-outline', title: 'sec.messages', desc: 'sec.messages.d', body: <WelcomeMessagesEditor id={id} settings={s} /> },
      { key: 'helpers', icon: 'people-outline', title: 'sec.helpers', desc: 'sec.helpers.d', body: <WelcomeAdminsEditor id={id} settings={s} /> },
    ];
  }
  if (d.bot.kind === 'mod') {
    const s = d.settings as MS;
    return [
      { key: 'roles', icon: 'people-outline', title: 'sec.roles', desc: 'sec.roles.d', body: <ModRolesEditor id={id} settings={s} /> },
      { key: 'words', icon: 'ban-outline', title: 'sec.words', desc: 'sec.words.d', body: <BannedWordsEditor id={id} settings={s} /> },
      { key: 'messages', icon: 'chatbubbles-outline', title: 'sec.messages', desc: 'sec.messages.d', body: <ModWelcomesEditor id={id} settings={s} /> },
      { key: 'spots', icon: 'navigate-outline', title: 'sec.spots', desc: 'sec.spots.d', body: <DestinationsEditor id={id} settings={s} /> },
    ];
  }
  const s = d.settings as MuS;
  return [
    { key: 'player', icon: 'play-circle-outline', title: 'sec.player', desc: 'sec.player.d', body: <LiveControls id={id} running={d.bot.status === 'running'} /> },
    { key: 'roles', icon: 'people-outline', title: 'sec.djroles', desc: 'sec.djroles.d', body: <MusicRolesEditor id={id} settings={s} /> },
    { key: 'announce', icon: 'megaphone-outline', title: 'sec.announce', desc: 'sec.announce.d', body: <AnnouncementsEditor id={id} settings={s} /> },
    { key: 'music', icon: 'options-outline', title: 'sec.music', desc: 'sec.music.d', body: <PlaybackEditor id={id} settings={s} /> },
  ];
}

export default function BotScreen() {
  const params = useLocalSearchParams<{ kind: string; id: string; open?: string }>();
  const kind = (BOT_KINDS.includes(params.kind as BotKind) ? params.kind : 'welcome') as BotKind;
  const id = Number(params.id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = useBot(kind, id);
  const [deleting, setDeleting] = useState(false);
  const openParam = params.open ?? null;
  // per Link geöffneten Abschnitt einmal ins Bild scrollen
  const scroller = useRef<ScrollViewInstance>(null);
  const blockY = useRef({ main: 0, adv: 0 });
  const scrolledFor = useRef<string | null>(null);
  const scrollToSection = (block: 'main' | 'adv', y: number) => {
    if (!openParam || scrolledFor.current === openParam) return;
    scrolledFor.current = openParam;
    setTimeout(() => scroller.current?.scrollTo({ y: Math.max(0, blockY.current[block] + y - 12), animated: true }), 150);
  };
  const advancedOpen = openParam === 'logs' || openParam === 'position' ? openParam : null;

  const { refreshing, onRefresh } = usePullRefresh(
    useCallback(
      () =>
        Promise.all([
          q.refetch(),
          queryClient.invalidateQueries({ queryKey: keys.presence(kind, id) }),
          queryClient.invalidateQueries({ queryKey: keys.logs(kind, id) }),
        ]),
      [q.refetch, kind, id],
    ),
  );

  const remove = async () => {
    const bot = q.data?.bot;
    if (!bot) return;
    if (!(await confirm(t('detail.deleteConfirmTitle', { name: bot.name }), t('detail.deleteConfirmText'), t('common.delete')))) return;
    setDeleting(true);
    try {
      await bots.remove(kind, id);
      haptic.success();
      queryClient.setQueryData<Bot[]>(keys.bots, (l) => l?.filter((b) => !(b.kind === kind && b.id === id)));
      queryClient.removeQueries({ queryKey: keys.bot(kind, id) });
      queryClient.invalidateQueries({ queryKey: keys.me });
      toast(t('detail.deleted'), 'success');
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      haptic.error();
      toast(errorText(e), 'error');
      setDeleting(false);
    }
  };

  const notFound = q.error instanceof ApiError && q.error.code === 'not_found';
  const d = q.data;

  const secs: Sec[] = d
    ? [
        ...kindSections(d),
        { key: 'room', icon: 'home-outline', title: 'sec.room', desc: 'sec.room.d', body: <NameRoomEditor detail={d} /> },
        { key: 'key', icon: 'key-outline', title: 'sec.key', desc: 'sec.key.d', body: <KeyEditor detail={d} startOpen={openParam === 'key'} /> },
        { key: 'activity', icon: 'pulse-outline', title: 'sec.activity', desc: 'sec.activity.d', body: <Activity kind={kind} id={id} /> },
        { key: 'commands', icon: 'terminal-outline', title: 'sec.commands', desc: 'sec.commands.d', body: <CommandList kind={kind} /> },
      ]
    : [];
  const advanced: Sec[] = d
    ? [
        { key: 'position', icon: 'locate-outline', title: 'sec.position', desc: 'sec.position.d', body: <PositionEditor detail={d} /> },
        {
          key: 'restart', icon: 'refresh-outline', title: 'sec.restart', desc: 'sec.restart.d',
          body: (
            <Button
              testID="detail-restart"
              label={t('bots.restart')}
              icon="refresh"
              variant="secondary"
              disabled={d.bot.status !== 'running'}
              onPress={() => powerBot(d.bot, 'restart')}
            />
          ),
        },
        { key: 'logs', icon: 'document-text-outline', title: 'sec.logs', desc: 'sec.logs.d', body: <Logs kind={kind} id={id} running={d.bot.status === 'running'} /> },
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: d?.bot.name ?? '' }} />
      <Backdrop />
      {q.isLoading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 80 }} />
      ) : notFound ? (
        <Empty icon="help-circle-outline" title={t('detail.notFound')}>
          <Button label={t('common.back')} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </Empty>
      ) : !d ? (
        <View style={{ padding: S.lg }}>
          <ErrorBox text={errorText(q.error)} onRetry={() => q.refetch()} retryLabel={t('common.retry')} />
        </View>
      ) : (
        <ScrollView
          ref={scroller}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: insets.bottom + 48 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text2} />}
        >
          <StatusCard bot={d.bot} />
          <View onLayout={(e) => { blockY.current.main = e.nativeEvent.layout.y; }}>
            <Accordion secs={secs} initial={openParam && !advancedOpen ? openParam : null} onInitialY={(y) => scrollToSection('main', y)} />
          </View>

          <Text style={[T.section, { paddingHorizontal: 4, marginTop: S.sm }]}>{t('sec.advanced')}</Text>
          <View onLayout={(e) => { blockY.current.adv = e.nativeEvent.layout.y; }}>
            <AdvancedBlock secs={advanced} initial={advancedOpen} onInitialY={(y) => scrollToSection('adv', y)} />
          </View>

          <View style={{ gap: S.sm, marginTop: S.lg }}>
            <Button label={t('detail.delete')} variant="danger" icon="trash-outline" onPress={remove} loading={deleting} testID="detail-delete" />
            <Text style={[T.caption, { textAlign: 'center' }]}>{t('detail.created', { date: shortDate(d.bot.created_at) })}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/** „Erweitert“ ist selbst zugeklappt; darin wieder die einzelnen Abschnitte */
function AdvancedBlock({ secs, initial, onInitialY }: { secs: Sec[]; initial: string | null; onInitialY?: (y: number) => void }) {
  const [open, setOpen] = useState(!!initial);
  useEffect(() => {
    if (initial) setOpen(true);
  }, [initial]);
  if (!open) {
    return (
      <Pressable
        testID="sec-advanced"
        accessibilityRole="button"
        onPress={() => { haptic.select(); animateLayout(); setOpen(true); }}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 60, paddingHorizontal: S.lg, borderRadius: R.lg,
          borderWidth: 1, borderStyle: 'dashed', borderColor: C.cardBorder, opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="construct-outline" size={20} color={C.text2} />
        <Text style={[T.callout, { flex: 1 }]}>{t('sec.advanced.d')}</Text>
        <Ionicons name="chevron-down" size={20} color={C.text3} />
      </Pressable>
    );
  }
  return <Accordion secs={secs} initial={initial} onInitialY={onInitialY} />;
}

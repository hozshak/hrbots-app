// DJ (Musik-Bot): Musik · Was er sagt · Helfer · Tickets · Aktivität.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { cleanUsername, isUsername, music, INPUT_LIMITS, type BotDetail, type MusicAction, type MusicRole, type MusicSettings } from '@/api';
import { keys, useNow } from '@/lib/query';
import { at, relTime } from '@/lib/format';
import { errorText, t, type Key } from '@/lib/i18n';
import { content } from '@/lib/content';
import { confirm, haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, R, S, T } from '@/lib/theme';
import { Button, Choice, Empty, ErrorState, Field, IconBtn, ListItem, Loading, Note, Tabs, ToggleRow, Txt } from '../ui';
import { AddPanel, MessageList, NameField, NameList, PresetOrNumber, useBotChange } from '../editors';
import { PowerButton } from '../BotCard';
import { StreamPlayer } from '../StreamPlayer';
import { OwnerEditor } from './mod';
import { Visitors } from './common';
import { useSession } from '@/lib/session';

type P = { d: BotDetail };
const sOf = (d: BotDetail) => d.settings as MusicSettings;

// ---------------------------------------------------------------- Musik (live)
export function MusicPlayer({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const running = d.bot.status === 'running';
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<MusicAction | null>(null);
  const { run } = useBotChange('music', id, [keys.extra('recent', 'music', id)]);
  const send = async (action: MusicAction, q?: string) => {
    setBusy(action);
    try {
      await music.command(id, action, q);
      haptic.success();
      toast(t('music.sent'), 'success', 1400);
      if (q) setQuery('');
    } catch (e) {
      haptic.error();
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      {!running ? (
        <>
          <Note emoji="😴" tone="warn" text={t('music.offNote')} />
          <PowerButton bot={d.bot} />
        </>
      ) : null}
      <View style={{ gap: S.md, opacity: running ? 1 : 0.45 }} pointerEvents={running ? 'auto' : 'none'}>
        <Field
          label={t('music.songQ')}
          value={query}
          onChangeText={setQuery}
          placeholder={t('music.songPh')}
          maxLength={INPUT_LIMITS.query}
          returnKeyType="search"
          onSubmitEditing={() => query.trim() && send('play', query.trim())}
          testID="music-query"
          big
        />
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Button label={t('music.play')} emoji="▶️" style={{ flex: 1 }} disabled={!query.trim()} loading={busy === 'play'} onPress={() => send('play', query.trim())} testID="music-play" />
          <Button label={t('music.playNext')} emoji="⏫" variant="secondary" style={{ flex: 1 }} disabled={!query.trim()} loading={busy === 'play_top'} onPress={() => send('play_top', query.trim())} />
        </View>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {([
            ['voldown', '🔉', t('music.quieter')],
            ['skip', '⏭️', t('music.skip')],
            ['volup', '🔊', t('music.louder')],
          ] as const).map(([a, emoji, label]) => (
            <Pressable
              key={a}
              testID={`music-${a}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              disabled={!!busy}
              onPress={() => send(a)}
              style={({ pressed }) => ({
                flex: 1, minHeight: 92, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', gap: 4,
                backgroundColor: pressed ? C.cardPressed : C.card, borderWidth: 1, borderColor: pressed ? C.accent : C.cardBorder,
              })}
            >
              <Txt style={{ fontSize: 32 }} maxFontSizeMultiplier={1.2}>{emoji}</Txt>
              <Txt style={[T.sub, { color: C.text, fontWeight: '700', textAlign: 'center' }]} numberOfLines={1}>{label}</Txt>
            </Pressable>
          ))}
        </View>
      </View>
      <ToggleRow
        emoji="🔁"
        label={t('music.autoplay')}
        hint={t('music.autoplayHint')}
        value={s.autoplay}
        testID="music-autoplay"
        onChange={(v) =>
          run(async () => {
            await music.setSettings(id, { autoplay: v });
            if (running) await music.command(id, v ? 'autoplay_on' : 'autoplay_off').catch(() => {});
          })
        }
      />
      <Button
        label={t('music.clear')}
        emoji="🧹"
        variant="secondary"
        small
        disabled={!running}
        loading={busy === 'clearqueue'}
        onPress={async () => { if (await confirm(t('music.clearQ'), '', t('music.clear'))) send('clearqueue'); }}
      />
      {/* wie der Player „Live Stream“ der Webseite */}
      {s.stream_url ? <StreamPlayer url={s.stream_url} testID="music-player" /> : null}
    </>
  );
}

// ---------------------------------------------------------------- Was er sagt (Ansagen)
const EVERY = [60, 300, 600, 1800, 3600];
export function MusicSay({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const { busy, run } = useBotChange('music', id);
  const lines = s.announcements.lines;
  const iv = s.announcements.interval_sec;
  const save = (next: string[], interval = iv) => run(() => music.setAnnouncements(id, next, interval));
  const label = (sec: number) => (sec >= 3600 ? t('time.hour1') : sec === 60 ? t('time.min1') : t('time.mins', { n: Math.round(sec / 60) }));
  return (
    <>
      <Txt style={T.callout}>{t('say.musicSub')}</Txt>
      <MessageList
        items={lines.map((l, i) => ({ id: i, text: l }))}
        templates={content.announcements}
        addLabel={t('say.addLine')}
        withTarget={false}
        maxLen={INPUT_LIMITS.announceLine}
        busy={busy}
        onAdd={async (text) => (lines.length >= INPUT_LIMITS.announceLines ? (toast(t('say.tooMany'), 'info'), false) : save([...lines, text]))}
        onDelete={(m) => save(lines.filter((_, i) => i !== m.id))}
        onSave={(m, text) => save(lines.map((l, i) => (i === m.id ? text : l)))}
      />
      <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>⏰ {t('say.every')}</Txt>
      <PresetOrNumber
        testID="every"
        value={iv}
        busy={busy}
        onPick={(v) => save(lines, v)}
        presets={EVERY.map((sec) => ({ value: sec, label: label(sec) }))}
        fieldLabel={t('say.everyCustom')}
        min={INPUT_LIMITS.intervalMin}
        max={INPUT_LIMITS.intervalMax}
        badText={t('say.everyBad')}
        fmt={(n) => t('time.secs', { n })}
      />
    </>
  );
}

// ---------------------------------------------------------------- Helfer
type HelperTab = 'owner' | MusicRole | 'blocked';
export function MusicHelpers({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const { busy, run } = useBotChange('music', id);
  const [tab, setTab] = useState<HelperTab>('dj');
  const emoji: Record<HelperTab, string> = { owner: '👑', mod: '🛡️', dj: '🎧', vip: '💎', blocked: '🚫' };
  const labelKey = (r: HelperTab): Key => (r === 'mod' ? 'role.musicmod' : r === 'vip' ? 'role.vip' : (`role.${r}` as Key));
  return (
    <>
      <Tabs<HelperTab>
        value={tab}
        onChange={setTab}
        options={(['owner', 'dj', 'mod', 'vip', 'blocked'] as HelperTab[]).map((r) => ({
          value: r, emoji: emoji[r], label: t(labelKey(r)), count: r === 'owner' ? undefined : r === 'blocked' ? s.blocked.length : s.roles[r].length,
        }))}
      />
      {tab === 'owner' ? (
        <OwnerEditor owner={s.owner_username} busy={busy} onSave={(u) => run(() => music.setOwner(id, u))} />
      ) : (
        <>
          <Txt style={T.callout}>{t(`role.${tab === 'mod' ? 'musicmod' : tab === 'vip' ? 'musicvip' : tab}.d` as Key)}</Txt>
          <NameList
            key={tab}
            names={tab === 'blocked' ? s.blocked : s.roles[tab]}
            addLabel={tab === 'blocked' ? t('helpers.block') : t('helpers.addRole', { role: t(labelKey(tab)) })}
            emptyEmoji={emoji[tab]}
            busy={busy}
            testID={`role-${tab}`}
            onAdd={(u) => run(() => (tab === 'blocked' ? music.block(id, u) : music.addRole(id, tab, u)))}
            onRemove={(u) => run(() => (tab === 'blocked' ? music.unblock(id, u) : music.removeRole(id, tab, u)))}
          />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Song-Tickets (ohne Preise)
export function MusicTickets({ d }: P) {
  const id = d.bot.id;
  const tkey = keys.extra('tickets', 'music', id);
  const q = useQuery({ queryKey: tkey, queryFn: () => music.tickets(id) });
  const { busy, run } = useBotChange('music', id, [tkey]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(1);
  const u = cleanUsername(name);
  const ok = !!u && isUsername(u);
  const change = (user: string, delta: number) => run(() => music.changeTickets(id, user, delta), null);
  return (
    <>
      <Txt style={T.callout}>{t('tickets.sub')}</Txt>
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? (
        <Empty emoji="🎟️" title={t('tickets.empty')} />
      ) : (
        (q.data ?? []).map((x) => (
          <ListItem
            key={x.username}
            emoji="🎟️"
            title={at(x.username)}
            sub={x.tickets === 1 ? t('tickets.count1') : t('tickets.count', { n: x.tickets })}
            right={
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <IconBtn icon="remove" label={t('tickets.take')} onPress={() => change(x.username, -1)} disabled={busy} />
                <IconBtn icon="add" label={t('tickets.give')} color={C.onAccent} bg={C.accent} onPress={() => change(x.username, 1)} disabled={busy} />
              </View>
            }
          />
        ))
      )}
      <AddPanel label={t('tickets.add')} open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} testID="tickets-add">
        <NameField value={name} onChange={setName} autoFocus />
        <Choice<number> columns={4} value={amount} onChange={setAmount} options={[1, 3, 5, 10].map((n) => ({ value: n, label: `+${n}` }))} />
        <Button label={t('tickets.give')} icon="add" disabled={!ok} loading={busy}
          onPress={async () => { if (await change(u, amount)) { setName(''); setOpen(false); } }} />
      </AddPanel>
    </>
  );
}

// ---------------------------------------------------------------- Aktivität
type ActTab = 'visitors' | 'commands';
const CMD_EMOJI: Record<string, string> = { play: '▶️', play_top: '⏫', skip: '⏭️', volup: '🔊', voldown: '🔉', clearqueue: '🧹', autoplay_on: '🔁', autoplay_off: '⏹️' };
export function MusicActivity({ d }: P) {
  const id = d.bot.id;
  const [tab, setTab] = useState<ActTab>('visitors');
  const now = useNow(30000);
  // eigene Befehle aus der App tragen den Kontonamen (Server) – den nicht extra anzeigen
  const me = (useSession().user?.username ?? '').toLowerCase();
  const q = useQuery({ queryKey: keys.extra('recent', 'music', id), queryFn: () => music.recentCommands(id), enabled: tab === 'commands', refetchInterval: 10000 });
  return (
    <>
      <Tabs<ActTab> value={tab} onChange={setTab} options={[{ value: 'visitors', emoji: '🚶', label: t('activity.visitors') }, { value: 'commands', emoji: '🎛️', label: t('activity.commands') }]} />
      {tab === 'visitors' ? <Visitors d={d} /> : q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? (
        <Empty emoji="🎛️" title={t('activity.commandsEmpty')} />
      ) : (
        <View style={{ gap: S.sm }}>
          {(q.data ?? []).map((c) => (
            <ListItem
              key={c.id}
              emoji={c.status === 'error' ? '❌' : c.status === 'done' ? CMD_EMOJI[c.action] ?? '🎵' : '⏳'}
              title={`${t(`cmd.${c.action}` as Key)}${c.args?.query ? `: ${c.args.query}` : ''}`}
              sub={[c.requested_by && c.requested_by !== 'app' && c.requested_by.toLowerCase() !== me ? at(c.requested_by) : null, t(`cmdstatus.${c.status}` as Key), relTime(c.created_at, now)].filter(Boolean).join(' · ')}
            />
          ))}
        </View>
      )}
    </>
  );
}

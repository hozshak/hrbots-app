// Seiten, die jede Bot-Art hat: Aktivität · Beobachten · Hilfe · Experten-Einstellungen („Wo er steht“: position.tsx).
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import {
  bots, cleanUsername, isBotToken, isUsername, mod, music, parseRoom, welcome, ApiError, EXTRA_LIMITS, INPUT_LIMITS, type Bot, type BotDetail,
  type BotEngine, type ModSettings, type MusicSettings, type TrackedUser, type UploadFile, type WelcomeSettings,
} from '@/api';
import { pickMp3, PickError } from '@/lib/media';
import { keys, powerBot, queryClient, useNow } from '@/lib/query';
import { at, fileSize, relTime, shortDate } from '@/lib/format';
import { errorText, t, type Key } from '@/lib/i18n';
import { content, CREATE_HIGHRISE } from '@/lib/content';
import { confirm, haptic, openRoom, openUrl } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, mono, R, S, T } from '@/lib/theme';
import {
  AppSwitch, Button, Choice, CodeChip, Empty, ErrorState, Field, ListItem, Loading, Note, PasteButton, SectionTitle, Txt,
} from '../ui';
import { Expandable, GuideSteps, HelpBits } from '../guide';
import { CommandList } from '../CommandList';
import { AddPanel, askDelete, NameField, useBotChange } from '../editors';
import { coordsOk, num, SpotEditor, useSaveBot, XYZ } from './position';

export { num, numText, StandPage, useSaveBot, XYZ } from './position';

export async function pasteText() {
  try {
    return (await Clipboard.getStringAsync()).trim();
  } catch {
    return '';
  }
}

// ============================================================ Beobachten
export function WatchList({ d }: { d: BotDetail }) {
  const { bot } = d;
  const kind = bot.kind as 'welcome' | 'mod';
  // Welcome: Einträge mit id + an/aus · Mod: nur Namen
  const list: TrackedUser[] = kind === 'welcome'
    ? ((d.settings as WelcomeSettings).tracking ?? [])
    : ((d.settings as ModSettings).tracking ?? []).map((u, i) => ({ id: i, username: u, active: true }));
  const { busy, run } = useBotChange(bot.kind, bot.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const u = cleanUsername(name);
  const ok = !!u && isUsername(u);
  const add = async () => {
    if (ok && (await run(() => (kind === 'welcome' ? welcome.addTracking(bot.id, u) : mod.addTracking(bot.id, u))))) {
      setName('');
      setOpen(false);
    }
  };
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.callout}>{t('watch.sub')}</Txt>
      {list.length === 0 ? <Empty emoji="👀" title={t('watch.empty')} /> : null}
      {list.map((x) => (
        <ListItem
          key={x.username}
          emoji="👀"
          title={at(x.username)}
          muted={!x.active}
          right={kind === 'welcome' ? <AppSwitch value={x.active} label={x.username} onChange={(v) => run(() => welcome.setTracking(bot.id, x.id, v), null)} /> : null}
          onDelete={async () => {
            if (await askDelete(at(x.username))) run(() => (kind === 'welcome' ? welcome.removeTracking(bot.id, x.id) : mod.removeTracking(bot.id, x.username)));
          }}
        />
      ))}
      <AddPanel label={t('watch.add')} open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} testID="watch-add">
        <NameField value={name} onChange={setName} onSubmit={add} autoFocus />
        <Button label={t('common.add')} icon="add" onPress={add} disabled={!ok} loading={busy} />
      </AddPanel>
    </View>
  );
}

// ============================================================ Aktivität: wer kam und ging
export function Visitors({ d }: { d: BotDetail }) {
  const { kind, id } = d.bot;
  const now = useNow(30000);
  const q = useQuery({ queryKey: keys.presence(kind, id), queryFn: () => bots.presence(kind, id), refetchInterval: 15000 });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const events = q.data ?? [];
  if (!events.length) return <Empty emoji="🫥" title={t('activity.empty')} text={t('activity.emptyText')} />;
  return (
    <View style={{ gap: S.sm }}>
      {events.slice(0, 50).map((e, i) => {
        const join = e.event === 'join' || e.event === 'enter';
        return (
          <ListItem
            key={`${e.created_at}-${e.username}-${i}`}
            emoji={join ? '🟢' : '👋'}
            title={at(e.username)}
            sub={`${join ? t('activity.came') : t('activity.left')} · ${relTime(e.created_at, now)}`}
          />
        );
      })}
    </View>
  );
}

// ============================================================ Hilfe
export function HelpPage({ d }: { d: BotDetail }) {
  return (
    <>
      <SectionTitle title={t('help.chatWords')} />
      <Txt style={T.callout}>{t('help.chatWordsSub')}</Txt>
      <CommandList kind={d.bot.kind} />
      <SectionTitle title={t('help.guides')} />
      <Expandable title={content.guides.designer.title} emoji="🚪"><GuideSteps guide="designer" /></Expandable>
      <Expandable title={content.guides.roomLink.title} emoji="🔗"><GuideSteps guide="roomLink" /></Expandable>
      <Expandable title={content.guides.token.title} emoji="🔑"><GuideSteps guide="token" /></Expandable>
      {d.bot.kind !== 'music' ? <Expandable title={content.guides.messages.title} emoji="👋"><GuideSteps guide="messages" /></Expandable> : null}
      {d.bot.kind === 'mod' ? <Expandable title={content.guides.vipzone.title} emoji="💎"><GuideSteps guide="vipzone" /></Expandable> : null}
      {d.bot.kind === 'music' ? <Expandable title={content.guides.djSongs.title} emoji="💿"><GuideSteps guide="djSongs" /></Expandable> : null}
      {d.bot.kind === 'music' ? <Expandable title={content.guides.radio.title} emoji="📻"><GuideSteps guide="radio" /></Expandable> : null}
      <Expandable title={content.guides.startStop.title} emoji="⏯️"><GuideSteps guide="startStop" /></Expandable>
      <Button label={t('help.writeUs')} emoji="💌" variant="secondary" onPress={() => router.push({ pathname: '/tickets/new', params: { bot: `${d.bot.kind}:${d.bot.id}` } })} />
    </>
  );
}

// ============================================================ Experten-Einstellungen
function NameEditor({ bot }: { bot: Bot }) {
  const { busy, save } = useSaveBot(bot);
  const [name, setName] = useState(bot.name);
  useEffect(() => setName(bot.name), [bot.name]);
  const changed = name.trim() && name.trim() !== bot.name;
  return (
    <View style={{ gap: S.sm }}>
      <Field accessibilityLabel={t('expert.name')} value={name} onChangeText={setName} maxLength={INPUT_LIMITS.name} placeholder={t('wiz.namePh')} returnKeyType="done" testID="edit-name" />
      {changed ? <Button label={t('common.save')} small onPress={() => save('name', { name: name.trim() })} loading={busy === 'name'} testID="save-name" /> : null}
    </View>
  );
}

function RoomEditor({ bot }: { bot: Bot }) {
  const { busy, save } = useSaveBot(bot);
  const orig = bot.room_url || bot.room_id;
  const [room, setRoom] = useState(orig);
  useEffect(() => setRoom(orig), [orig]);
  const check = useMemo(() => parseRoom(room), [room]);
  const changed = room.trim() !== orig;
  return (
    <View style={{ gap: S.sm }}>
      <Field
        label={t('wiz.roomLabel')}
        value={room}
        onChangeText={setRoom}
        autoCapitalize="none"
        keyboardType="url"
        ltr
        testID="edit-room"
        error={changed && !check.ok ? t(`room.${check.reason}` as Key) : null}
        ok={changed && check.ok ? t('wiz.roomOk') : null}
        right={<PasteButton onPaste={async () => { const v = await pasteText(); if (v) setRoom(v); else toast(t('wiz.clipEmpty')); }} />}
      />
      {changed && check.ok ? <Button label={t('common.save')} small onPress={() => save('room', { room: room.trim() })} loading={busy === 'room'} testID="save-room" /> : null}
      <Button label={t('expert.openRoom')} small variant="secondary" emoji="🚪" onPress={() => openRoom(bot.room_url || `https://high.rs/room?id=${bot.room_id}`)} />
      <Txt style={T.sub}>{t('expert.restartHint')}</Txt>
      <HelpBits guide="roomLink" />
    </View>
  );
}

function KeyEditor({ bot }: { bot: Bot }) {
  const { busy, save } = useSaveBot(bot);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const ok = isBotToken(token);
  return (
    <View style={{ gap: S.sm }}>
      <Note emoji={bot.bot_token_set ? '✅' : '⚠️'} tone={bot.bot_token_set ? 'good' : 'warn'} text={bot.bot_token_set ? t('expert.keySaved') : t('expert.keyMissing')} />
      {!open ? (
        <Button label={t('expert.keyReplace')} small variant="secondary" emoji="🔑" onPress={() => setOpen(true)} testID="token-replace" />
      ) : (
        <>
          <Field
            value={token}
            onChangeText={setToken}
            placeholder={t('wiz.keyPh')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            ltr
            error={token.length > 0 && !ok ? t('wiz.keyBad') : null}
            ok={ok ? t('wiz.keyOk') : null}
            hint={t('wiz.keyPrivate')}
            testID="token-input"
            right={<PasteButton onPaste={async () => { const v = await pasteText(); if (v) setToken(v); else toast(t('wiz.clipEmpty')); }} />}
          />
          <Button
            label={t('common.save')}
            small
            disabled={!ok}
            loading={busy === 'token'}
            testID="token-save"
            onPress={async () => {
              if (await save('token', { bot_token: token.trim() }, t('expert.keySaved'))) {
                setToken('');
                setOpen(false);
              }
            }}
          />
          <Button label={t('wiz.openSite')} small variant="secondary" emoji="🌐" onPress={() => openUrl(CREATE_HIGHRISE)} />
          <Button label={t('common.cancel')} small variant="ghost" onPress={() => { setToken(''); setOpen(false); }} />
        </>
      )}
      <HelpBits guide="token" />
    </View>
  );
}

function EngineEditor({ d }: { d: BotDetail }) {
  const { bot } = d;
  const { busy, save } = useSaveBot(bot);
  const engine = (d.settings as { engine?: BotEngine }).engine;
  if (!engine) return <Txt style={T.sub}>{t('expert.engineUnknown')}</Txt>;
  return (
    <View style={{ gap: S.sm }}>
      <Choice<BotEngine>
        testID="engine"
        value={engine}
        onChange={(v) => v !== engine && save('engine', { engine: v })}
        options={[{ value: 'js', label: t('expert.engineA'), emoji: '🅰️' }, { value: 'python', label: t('expert.engineB'), emoji: '🅱️' }]}
      />
      {busy ? <ActivityIndicator color={C.accent} /> : null}
      <Txt style={T.sub}>{t('expert.engineHint')}</Txt>
    </View>
  );
}

function Logs({ bot }: { bot: Bot }) {
  const q = useQuery({ queryKey: keys.logs(bot.kind, bot.id), queryFn: () => bots.logs(bot.kind, bot.id), refetchInterval: bot.status === 'running' ? 5000 : false });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const lines = [...(q.data ?? [])].reverse().slice(0, 200);
  // Webseite: „PID nnn“ beim laufenden Bot
  const pid = bot.pid ? <Txt style={T.caption} selectable>{t('expert.pid', { pid: bot.pid })}</Txt> : null;
  if (!lines.length) return <View style={{ gap: S.sm }}>{pid}<Txt style={T.sub}>{t('expert.logsEmpty')}</Txt></View>;
  return (
    <View style={{ backgroundColor: C.logBg, borderRadius: R.sm, padding: S.md, gap: 6, direction: 'ltr' }}>
      {pid}
      <Txt style={T.caption}>{t('expert.logsNewest')}</Txt>
      {lines.map((l, i) => (
        <Txt key={i} selectable style={{ fontFamily: mono, fontSize: 12, lineHeight: 17, textAlign: 'left', color: /\bERROR\b|\bFATAL\b/i.test(l) ? C.red : /\bWARN/i.test(l) ? C.yellow : C.text2 }}>{l}</Txt>
      ))}
    </View>
  );
}

function ModCommandWords({ d }: { d: BotDetail }) {
  const s = d.settings as ModSettings;
  const { busy, run } = useBotChange('mod', d.bot.id);
  const [go, setGo] = useState(s.commands.go);
  const [tp, setTp] = useState(s.commands.tp);
  useEffect(() => { setGo(s.commands.go); setTp(s.commands.tp); }, [s.commands.go, s.commands.tp]);
  const changed = go.trim() !== s.commands.go || tp.trim() !== s.commands.tp;
  // Server: 1–20 Zeichen ohne Leerzeichen; leer = Standard (!go / !tp)
  const bad = (w: string) => /\s/.test(w.trim()) || w.trim().length > EXTRA_LIMITS.cmdWord;
  const err = bad(go) || bad(tp) ? t('expert.cmdBad') : null;
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.sub}>{t('expert.cmdHint')}</Txt>
      <View style={{ flexDirection: 'row', gap: S.sm, direction: 'ltr' }}>
        <Field style={{ flex: 1 }} label={t('expert.cmdGo')} value={go} onChangeText={setGo} autoCapitalize="none" maxLength={EXTRA_LIMITS.cmdWord} placeholder="!go" ltr invalid={bad(go)} testID="cmd-go" />
        <Field style={{ flex: 1 }} label={t('expert.cmdTp')} value={tp} onChangeText={setTp} autoCapitalize="none" maxLength={EXTRA_LIMITS.cmdWord} placeholder="!tp" ltr invalid={bad(tp)} testID="cmd-tp" />
      </View>
      {err ? <Txt style={[T.sub, { color: C.red, fontWeight: '600' }]}>⚠️ {err}</Txt> : <Txt style={T.caption}>{t('expert.cmdEmpty')}</Txt>}
      {changed ? <Button label={t('common.save')} small disabled={!!err} loading={busy} onPress={() => run(() => mod.setCommands(d.bot.id, go.trim(), tp.trim()))} testID="cmd-save" /> : null}
    </View>
  );
}

function VipSafeEditor({ d }: { d: BotDetail }) {
  const s = d.settings as ModSettings;
  const { busy, run } = useBotChange('mod', d.bot.id);
  const v = s.vip?.safe_spot ?? null;
  const [x, setX] = useState(v ? String(v.x) : '');
  const [y, setY] = useState(v ? String(v.y) : '');
  const [z, setZ] = useState(v ? String(v.z) : '');
  useEffect(() => { setX(v ? String(v.x) : ''); setY(v ? String(v.y) : ''); setZ(v ? String(v.z) : ''); }, [v?.x, v?.y, v?.z]);
  const valid = coordsOk({ x, y, z });
  const changed = !v || num(x) !== v.x || num(y) !== v.y || num(z) !== v.z;
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.sub}>{t('expert.vipSafeHint')}</Txt>
      <CodeChip text="!setvipsafe" />
      <Txt style={[T.sub, { color: C.text, fontWeight: '700' }]}>{v ? t('expert.vipSafeSet') : t('expert.vipSafeNone')}</Txt>
      <XYZ x={x} y={y} z={z} setX={setX} setY={setY} setZ={setZ} testID="vipsafe" />
      {changed ? <Button label={t('common.save')} small disabled={!valid} loading={busy} onPress={() => run(() => mod.setVipSafe(d.bot.id, { x: num(x), y: num(y), z: num(z) }))} testID="vipsafe-save" /> : null}
      {v ? (
        <Button label={t('expert.vipSafeRemove')} small variant="danger" emoji="🗑️" loading={busy} testID="vipsafe-remove"
          onPress={async () => { if (await askDelete(t('expert.vipSafe'))) run(() => mod.setVipSafe(d.bot.id, null)); }} />
      ) : null}
    </View>
  );
}

function OutfitCodes({ d }: { d: BotDetail }) {
  const { busy, run } = useBotChange('mod', d.bot.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [items, setItems] = useState('');
  const list = items.split('\n').map((l) => l.trim()).filter(Boolean);
  // Server: 1–50 Teile, je ≤ 100 Zeichen
  const tooMany = list.length > EXTRA_LIMITS.outfitItems || list.some((l) => l.length > EXTRA_LIMITS.outfitItemLen);
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.sub}>{t('expert.outfitHint')}</Txt>
      <AddPanel label={t('look.add')} open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} testID="outfit-add">
        <Field label={t('look.name')} value={name} onChangeText={setName} maxLength={EXTRA_LIMITS.outfitName} placeholder={t('look.namePh')} testID="outfit-name" />
        <Field label={t('expert.outfitItems')} value={items} onChangeText={setItems} multiline autoCapitalize="none" placeholder={'shirt-f_punklace\nbody-flesh:65'} ltr
          error={tooMany ? t('expert.outfitTooMany') : null} hint={list.length ? t('look.items', { n: list.length }) : null} testID="outfit-items" />
        <Button label={t('common.add')} icon="add" disabled={!list.length || tooMany} loading={busy}
          onPress={async () => { if (await run(() => mod.addOutfit(d.bot.id, name.trim() || 'Outfit', list))) { setName(''); setItems(''); setOpen(false); } }} />
      </AddPanel>
    </View>
  );
}

function MusicExpert({ d }: { d: BotDetail }) {
  const s = d.settings as MusicSettings;
  const { busy, run } = useBotChange('music', d.bot.id);
  const [maxSong, setMaxSong] = useState(String(s.max_song_minutes));
  useEffect(() => setMaxSong(String(s.max_song_minutes)), [s.max_song_minutes]);
  const ms = Number(maxSong);
  const msOk = Number.isInteger(ms) && ms >= INPUT_LIMITS.songMin && ms <= INPUT_LIMITS.songMax;
  const ic = s.icecast;
  const [host, setHost] = useState(ic?.host ?? '');
  const [port, setPort] = useState(String(ic?.port ?? 80));
  const [user, setUser] = useState(ic?.user ?? '');
  const [pass, setPass] = useState('');
  const [mount, setMount] = useState(ic?.mount ?? '');
  const portN = Number(port);
  const portOk = Number.isInteger(portN) && portN > 0 && portN < 65536;
  const needPass = !pass && !ic?.password_set;
  const icOk = !!host.trim() && !!user.trim() && !needPass && !!mount.trim() && portOk;
  const icChanged = !ic || !!pass || host.trim() !== ic.host || portN !== ic.port || user.trim() !== ic.user || mount.trim() !== ic.mount;
  return (
    <>
      <Expandable title={t('expert.songLength')} emoji="⏱️">
        <View style={{ gap: S.sm }}>
          <Field label={t('expert.songLengthLabel')} value={maxSong} onChangeText={(v) => setMaxSong(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" error={!msOk ? t('expert.songLengthBad') : null} testID="max-song" />
          {msOk && ms !== s.max_song_minutes ? <Button label={t('common.save')} small loading={busy} onPress={() => run(() => music.setSettings(d.bot.id, { max_song_minutes: ms }))} /> : null}
        </View>
      </Expandable>
      <Expandable title={t('expert.stream')} emoji="📡">
        <View style={{ gap: S.sm }}>
          <Txt style={T.sub}>{t('expert.streamLink')}</Txt>
          <CodeChip text={s.stream_url || '–'} />
          {s.stream_url ? <Button label={t('common.copy')} small variant="secondary" emoji="📋" onPress={async () => { await Clipboard.setStringAsync(s.stream_url); toast(t('common.copied'), 'success'); }} /> : null}
          <SectionTitle title={t('expert.ownServer')} />
          <Txt style={T.sub}>{t('expert.ownServerHint')}</Txt>
          <Field label={t('expert.host')} value={host} onChangeText={setHost} autoCapitalize="none" keyboardType="url" maxLength={200} placeholder="radio.example.com" ltr testID="ic-host" />
          <View style={{ flexDirection: 'row', gap: S.sm, direction: 'ltr' }}>
            <Field style={{ flex: 1 }} label={t('expert.port')} value={port} onChangeText={(v) => setPort(v.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="number-pad" placeholder="8000" ltr invalid={!!port && !portOk} testID="ic-port" />
            <Field style={{ flex: 2 }} label={t('expert.mount')} value={mount} onChangeText={setMount} autoCapitalize="none" maxLength={200} placeholder="mount_abc" ltr testID="ic-mount" />
          </View>
          {port && !portOk ? <Txt style={[T.sub, { color: C.red, fontWeight: '600' }]}>⚠️ {t('expert.portBad')}</Txt> : null}
          <Field label={t('expert.user')} value={user} onChangeText={setUser} autoCapitalize="none" maxLength={100} placeholder="source" ltr testID="ic-user" />
          <Field label={t('expert.password')} value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" autoComplete="off" textContentType="none" maxLength={200} ltr
            hint={ic?.password_set ? t('expert.passwordSet') : t('expert.passwordNeeded')} testID="ic-pass" />
          {icChanged ? (
            <Button label={t('common.save')} small disabled={!icOk} loading={busy} testID="ic-save"
              onPress={async () => { if (await run(() => music.setIcecast(d.bot.id, { host: host.trim(), port: portN, user: user.trim(), mount: mount.trim(), ...(pass ? { password: pass } : {}) }))) setPass(''); }} />
          ) : null}
        </View>
      </Expandable>
      <Expandable title={t('expert.autoplayFiles')} emoji="💿">
        <AutoplayFiles d={d} />
      </Expandable>
    </>
  );
}

function AutoplayFiles({ d }: { d: BotDetail }) {
  const id = d.bot.id;
  const akey = keys.extra('autoplay', 'music', id);
  const q = useQuery({ queryKey: akey, queryFn: () => music.autoplay(id) });
  const { run } = useBotChange('music', id, [akey]);
  const [uploading, setUploading] = useState(false);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const files = q.data?.files ?? [];
  const max = q.data?.max_files ?? EXTRA_LIMITS.autoplayFiles;
  const full = files.length >= max;
  // wie das Upload-Formular der Webseite: nur .mp3, 1 B–10 MB, höchstens 20 Lieder
  const add = async () => {
    if (full) return toast(t('expert.autoplayFull'), 'info');
    let file: UploadFile | null;
    try {
      file = await pickMp3();
    } catch (e) {
      haptic.error();
      return toast(e instanceof PickError && e.reason === 'too_big' ? t('expert.autoplayTooBig') : t('expert.autoplayNotMp3'), 'error');
    }
    if (!file) return;
    setUploading(true);
    try {
      await music.uploadAutoplay(id, file);
      haptic.success();
      toast(t('expert.autoplayAdded'), 'success');
      await queryClient.invalidateQueries({ queryKey: akey });
    } catch (e) {
      haptic.error();
      toast(e instanceof ApiError && e.code === 'limit_reached' ? t('expert.autoplayFull') : errorText(e), 'error');
    } finally {
      setUploading(false);
    }
  };
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.sub}>{t('expert.autoplayHint')}</Txt>
      <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>💿 {t('expert.autoplayCount', { n: files.length, max })}</Txt>
      {files.length === 0 ? <Txt style={T.sub}>{t('expert.autoplayEmpty')}</Txt> : null}
      {files.map((f) => (
        <ListItem key={f.name} emoji="🎵" title={f.name} sub={fileSize(f.size)} onDelete={async () => { if (await askDelete(f.name)) run(() => music.removeAutoplayFile(id, f.name)); }} />
      ))}
      <Button label={uploading ? t('expert.autoplayUploading') : t('expert.autoplayAdd')} emoji="➕" loading={uploading} disabled={full} onPress={add} testID="autoplay-add" />
      {!(d.settings as MusicSettings).autoplay && files.length ? <Note emoji="🔁" text={t('expert.autoplayOff')} /> : null}
    </View>
  );
}

export function ExpertPage({ d }: { d: BotDetail }) {
  const { bot } = d;
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    if (!(await confirm(t('expert.deleteQ', { name: bot.name }), t('expert.deleteText'), t('common.delete')))) return;
    setDeleting(true);
    try {
      await bots.remove(bot.kind, bot.id);
      haptic.success();
      queryClient.setQueryData<Bot[]>(keys.bots, (l) => l?.filter((b) => !(b.kind === bot.kind && b.id === bot.id)));
      queryClient.removeQueries({ queryKey: keys.bot(bot.kind, bot.id) });
      queryClient.invalidateQueries({ queryKey: keys.me });
      toast(t('expert.deleted'), 'success');
      router.dismissTo('/');
    } catch (e) {
      haptic.error();
      toast(errorText(e), 'error');
      setDeleting(false);
    }
  };
  return (
    <>
      <Note emoji="🧑‍🔧" text={t('expert.intro')} />
      <Expandable title={t('expert.name')} emoji="🏷️" testID="exp-name"><NameEditor bot={bot} /></Expandable>
      <Expandable title={t('expert.room')} emoji="🏠" testID="exp-room"><RoomEditor bot={bot} /></Expandable>
      <Expandable title={t('expert.key')} emoji="🔑" testID="exp-key"><KeyEditor bot={bot} /></Expandable>
      <Expandable title={t('expert.spot')} emoji="📍" testID="exp-spot"><SpotEditor d={d} /></Expandable>
      {bot.kind === 'mod' ? (
        <>
          <Expandable title={t('expert.cmdWords')} emoji="⌨️"><ModCommandWords d={d} /></Expandable>
          <Expandable title={t('expert.vipSafe')} emoji="🛟"><VipSafeEditor d={d} /></Expandable>
          <Expandable title={t('expert.outfitCodes')} emoji="🧵"><OutfitCodes d={d} /></Expandable>
        </>
      ) : null}
      {bot.kind === 'music' ? <MusicExpert d={d} /> : null}
      <Expandable title={t('expert.engine')} emoji="⚙️"><EngineEditor d={d} /></Expandable>
      <Expandable title={t('expert.logs')} emoji="📜" testID="exp-logs"><Logs bot={bot} /></Expandable>
      <Button label={t('expert.restart')} emoji="🔄" variant="secondary" disabled={bot.status !== 'running'} onPress={() => powerBot(bot, 'restart')} testID="detail-restart" />
      <Button label={t('expert.delete')} emoji="🗑️" variant="danger" loading={deleting} onPress={remove} testID="detail-delete" />
      {bot.created_at ? <Txt style={[T.caption, { textAlign: 'center' }]}>{t('expert.created', { date: shortDate(bot.created_at) })}</Txt> : null}
    </>
  );
}

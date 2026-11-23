// Seiten, die jede Bot-Art hat: Wo er steht · Aktivität · Beobachten · Hilfe · Experten-Einstellungen.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import {
  bots, cleanUsername, isBotToken, isUsername, mod, music, parseRoom, welcome, ApiError, EXTRA_LIMITS, FACINGS, INPUT_LIMITS, type Bot, type BotDetail,
  type BotEngine, type Facing, type ModSettings, type MusicSettings, type TrackedUser, type UpdateBotInput, type UploadFile, type WelcomeSettings,
} from '@/api';
import { pickMp3, PickError } from '@/lib/media';
import { keys, powerBot, putBot, queryClient, useNow } from '@/lib/query';
import { fileSize, relTime, shortDate } from '@/lib/format';
import { errorText, t, type Key } from '@/lib/i18n';
import { content, CREATE_HIGHRISE } from '@/lib/content';
import { confirm, haptic, openRoom, openUrl } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { useSession } from '@/lib/session';
import { C, mono, R, S, T } from '@/lib/theme';
import {
  AppSwitch, Button, Card, Choice, CodeChip, Empty, ErrorState, Field, ListItem, Loading, Note, PasteButton, SectionTitle, Txt,
} from '../ui';
import { Expandable, GuideSteps, HelpBits } from '../guide';
import { CommandList } from '../CommandList';
import { AddPanel, askDelete, NameField, useBotChange } from '../editors';

export const num = (s: string) => (s.trim() === '' || s.trim() === '-' ? NaN : Number(s.replace(',', '.')));
export const numText = (s: string) => s.replace(/[^0-9.,-]/g, '');

export async function pasteText() {
  try {
    return (await Clipboard.getStringAsync()).trim();
  } catch {
    return '';
  }
}

/** Bot-Grunddaten speichern (Name, Raum, Schlüssel, Platz, Motor) */
export function useSaveBot(bot: Bot) {
  const [busy, setBusy] = useState<string | null>(null);
  const save = async (what: string, patch: UpdateBotInput, okText = t('common.saved')) => {
    setBusy(what);
    try {
      const b = await bots.update(bot.kind, bot.id, patch);
      putBot(b);
      await queryClient.invalidateQueries({ queryKey: keys.bot(bot.kind, bot.id) });
      haptic.success();
      toast(okText, 'success');
      return true;
    } catch (e) {
      haptic.error();
      toast(errorText(e), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, save };
}

const FACE_EMOJI: Record<Facing, string> = { FrontRight: '↘️', FrontLeft: '↙️', BackRight: '↗️', BackLeft: '↖️' };

// ============================================================ Wo er steht
export function StandPage({ d }: { d: BotDetail }) {
  const { bot, settings } = d;
  const { busy, save } = useSaveBot(bot);
  const me = useSession().user?.username || 'yourname';
  const p = settings.position;
  const cmd = bot.kind === 'mod' ? ['!posbot'] : bot.kind === 'welcome' ? [`-posuser @${me}`, `-stoppos @${me}`] : [];
  return (
    <>
      <Txt style={T.callout}>{t('stand.sub')}</Txt>
      <SectionTitle title={t('stand.facing')} />
      <Choice<Facing>
        testID="facing"
        value={p.facing}
        onChange={(f) => save('facing', { position: { ...p, facing: f } })}
        options={FACINGS.map((f) => ({ value: f, label: t(`facing.${f}` as Key), emoji: FACE_EMOJI[f] }))}
      />
      {busy ? <ActivityIndicator color={C.accent} /> : null}
      {cmd.length ? (
        <Card style={{ gap: S.md }}>
          <Txt style={T.headline}>🚶 {content.guides.stand.title}</Txt>
          <GuideSteps guide="stand" />
          {cmd.map((c) => <CodeChip key={c} text={c} />)}
        </Card>
      ) : null}
      <Note emoji="🧰" text={t('stand.exact')} />
    </>
  );
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
          title={`@${x.username}`}
          muted={!x.active}
          right={kind === 'welcome' ? <AppSwitch value={x.active} label={x.username} onChange={(v) => run(() => welcome.setTracking(bot.id, x.id, v), null)} /> : null}
          onDelete={async () => {
            if (await askDelete(`@${x.username}`)) run(() => (kind === 'welcome' ? welcome.removeTracking(bot.id, x.id) : mod.removeTracking(bot.id, x.username)));
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
            title={`@${e.username}`}
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
      <Field label={t('expert.name')} value={name} onChangeText={setName} maxLength={INPUT_LIMITS.name} testID="edit-name" />
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
        label={t('expert.room')}
        value={room}
        onChangeText={setRoom}
        autoCapitalize="none"
        keyboardType="url"
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

function SpotEditor({ d }: { d: BotDetail }) {
  const { bot, settings } = d;
  const { busy, save } = useSaveBot(bot);
  const p = settings.position;
  const [x, setX] = useState(String(p.x));
  const [y, setY] = useState(String(p.y));
  const [z, setZ] = useState(String(p.z));
  useEffect(() => { setX(String(p.x)); setY(String(p.y)); setZ(String(p.z)); }, [p.x, p.y, p.z]);
  const valid = [x, y, z].every((v) => Number.isFinite(num(v)));
  const changed = num(x) !== p.x || num(y) !== p.y || num(z) !== p.z;
  return (
    <View style={{ gap: S.sm }}>
      <XYZ x={x} y={y} z={z} setX={setX} setY={setY} setZ={setZ} testID="pos" />
      {changed ? (
        <Button label={t('common.save')} small disabled={!valid} loading={busy === 'pos'} testID="save-pos"
          onPress={() => save('pos', { position: { x: num(x), y: num(y), z: num(z), facing: p.facing } })} />
      ) : null}
    </View>
  );
}

export function XYZ({ x, y, z, setX, setY, setZ, testID, noY }: {
  x: string; y?: string; z: string; setX: (s: string) => void; setY?: (s: string) => void; setZ: (s: string) => void; testID?: string; noY?: boolean;
}) {
  const fields: [string, string, (s: string) => void][] = noY ? [['X', x, setX], ['Z', z, setZ]] : [['X', x, setX], ['Y', y ?? '', setY ?? (() => {})], ['Z', z, setZ]];
  return (
    <View style={{ flexDirection: 'row', gap: S.sm, direction: 'ltr' }}>
      {fields.map(([l, v, set]) => (
        <Field key={l} style={{ flex: 1 }} label={l} value={v} onChangeText={(s) => set(numText(s))} keyboardType="numbers-and-punctuation" placeholder="0" testID={testID ? `${testID}-${l.toLowerCase()}` : undefined} />
      ))}
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
    <View style={{ backgroundColor: '#000', borderRadius: R.sm, padding: S.md, gap: 6, direction: 'ltr' }}>
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
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.sub}>{t('expert.cmdHint')}</Txt>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Field style={{ flex: 1 }} label={t('expert.cmdGo')} value={go} onChangeText={setGo} autoCapitalize="none" maxLength={20} />
        <Field style={{ flex: 1 }} label={t('expert.cmdTp')} value={tp} onChangeText={setTp} autoCapitalize="none" maxLength={20} />
      </View>
      {changed ? <Button label={t('common.save')} small disabled={!go.trim() || !tp.trim()} loading={busy} onPress={() => run(() => mod.setCommands(d.bot.id, go.trim(), tp.trim()))} /> : null}
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
  const valid = [x, y, z].every((q) => Number.isFinite(num(q)));
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.sub}>{t('expert.vipSafeHint')}</Txt>
      <CodeChip text="!setvipsafe" />
      <XYZ x={x} y={y} z={z} setX={setX} setY={setY} setZ={setZ} />
      <Button label={t('common.save')} small disabled={!valid} loading={busy} onPress={() => run(() => mod.setVipSafe(d.bot.id, { x: num(x), y: num(y), z: num(z) }))} />
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
        <Field label={t('look.name')} value={name} onChangeText={setName} maxLength={40} placeholder="Party" />
        <Field label={t('expert.outfitItems')} value={items} onChangeText={setItems} multiline autoCapitalize="none" placeholder={'shirt-f_punklace\nbody-flesh:65'} style={{ direction: 'ltr' }}
          error={tooMany ? t('expert.outfitTooMany') : null} />
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
  const icOk = !!host.trim() && !!user.trim() && (!!pass || !!ic?.password_set) && !!mount.trim() && Number.isInteger(portN) && portN > 0 && portN < 65536;
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
          <Field label={t('expert.host')} value={host} onChangeText={setHost} autoCapitalize="none" keyboardType="url" style={{ direction: 'ltr' }} />
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Field style={{ flex: 1 }} label={t('expert.port')} value={port} onChangeText={(v) => setPort(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
            <Field style={{ flex: 2 }} label={t('expert.mount')} value={mount} onChangeText={setMount} autoCapitalize="none" />
          </View>
          <Field label={t('expert.user')} value={user} onChangeText={setUser} autoCapitalize="none" />
          <Field label={t('expert.password')} value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" hint={ic?.password_set ? t('expert.passwordSet') : null} />
          <Button label={t('common.save')} small disabled={!icOk} loading={busy}
            onPress={async () => { if (await run(() => music.setIcecast(d.bot.id, { host: host.trim(), port: portN, user: user.trim(), mount: mount.trim(), ...(pass ? { password: pass } : {}) }))) setPass(''); }} />
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

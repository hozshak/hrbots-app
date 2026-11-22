// Musik-Bot: Live-Steuerung (nur wenn er läuft), Rollen, Ansagen, Wiedergabe-Einstellungen.
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { music, type MusicAction, type MusicRole, type MusicSettings as MSet } from '@/api';
import { t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { errorText } from '@/lib/i18n';
import { C, S, T } from '@/lib/theme';
import { Button, Divider, Field, Toggle } from '../ui';
import { RoleEditor, useBotChange } from '../editors';

export function LiveControls({ id, running }: { id: number; running: boolean }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<MusicAction | null>(null);
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
  const off = !running;
  return (
    <View style={{ gap: S.md }}>
      {off ? <Text style={[T.body, { color: C.yellow }]}>{t('music.liveOff')}</Text> : null}
      <View style={{ gap: S.md, opacity: off ? 0.45 : 1 }} pointerEvents={off ? 'none' : 'auto'}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder={t('music.search')}
          editable={!off}
          returnKeyType="search"
          onSubmitEditing={() => query.trim() && send('play', query.trim())}
          testID="music-query"
          right={<Ionicons name="search" size={18} color={C.text3} style={{ marginRight: 12 }} />}
        />
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Button label={t('music.play')} icon="play" small style={{ flex: 1 }} disabled={off || !query.trim()} loading={busy === 'play'} onPress={() => send('play', query.trim())} testID="music-play" />
          <Button label={t('music.playTop')} icon="arrow-up" small variant="secondary" style={{ flex: 1 }} disabled={off || !query.trim()} loading={busy === 'play_top'} onPress={() => send('play_top', query.trim())} />
        </View>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {([
            ['skip', 'play-skip-forward', t('music.skip')],
            ['voldown', 'volume-low', t('music.volDown')],
            ['volup', 'volume-high', t('music.volUp')],
          ] as const).map(([a, icon, label]) => (
            <Pressable
              key={a}
              accessibilityRole="button"
              accessibilityLabel={label}
              disabled={off || !!busy}
              onPress={() => send(a)}
              style={({ pressed }) => ({
                flex: 1, minHeight: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4,
                backgroundColor: pressed ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
              })}
            >
              <Ionicons name={icon} size={22} color={C.text} />
              <Text style={[T.caption, { color: C.text2 }]} numberOfLines={1}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Button label={t('music.autoplayOn')} small variant="secondary" style={{ flex: 1 }} disabled={off} loading={busy === 'autoplay_on'} onPress={() => send('autoplay_on')} />
          <Button label={t('music.autoplayOff')} small variant="secondary" style={{ flex: 1 }} disabled={off} loading={busy === 'autoplay_off'} onPress={() => send('autoplay_off')} />
        </View>
        <Button label={t('music.clear')} small variant="ghost" icon="trash-outline" disabled={off} loading={busy === 'clearqueue'} onPress={() => send('clearqueue')} style={{ alignSelf: 'flex-start', marginLeft: -10 }} />
      </View>
    </View>
  );
}

type P = { id: number; settings: MSet };

export function MusicRolesEditor({ id, settings }: P) {
  const { busy, run } = useBotChange('music', id);
  return (
    <RoleEditor<MusicRole>
      roles={settings.roles}
      labels={{ mod: t('music.role.mod'), dj: t('music.role.dj'), vip: t('music.role.vip') }}
      busy={busy}
      onAdd={(r, u) => run(() => music.addRole(id, r, u))}
      onRemove={(r, u) => run(() => music.removeRole(id, r, u))}
    />
  );
}

export function AnnouncementsEditor({ id, settings }: P) {
  const { busy, run } = useBotChange('music', id);
  const [lines, setLines] = useState<string[]>(settings.announcements.lines);
  const [interval, setIntervalSec] = useState(String(settings.announcements.interval_sec));
  useEffect(() => setLines(settings.announcements.lines), [settings.announcements.lines.join('|')]);
  useEffect(() => setIntervalSec(String(settings.announcements.interval_sec)), [settings.announcements.interval_sec]);
  const iv = Number(interval);
  const ivOk = Number.isFinite(iv) && iv >= 30 && iv <= 3600;
  const changed = lines.join('|') !== settings.announcements.lines.join('|') || iv !== settings.announcements.interval_sec;
  return (
    <View style={{ gap: S.sm }}>
      <Text style={T.sub}>{t('music.announceHint')}</Text>
      {lines.map((l, i) => (
        <Field
          key={i}
          value={l}
          placeholder={t('music.line', { n: i + 1 })}
          onChangeText={(v) => setLines((ls) => ls.map((x, j) => (j === i ? v : x)))}
          maxLength={200}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.remove')} hitSlop={8} style={{ padding: 10 }} onPress={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
              <Ionicons name="close-circle" size={20} color={C.text3} />
            </Pressable>
          }
        />
      ))}
      {lines.length < 20 ? (
        <Button label={t('music.addLine')} small variant="secondary" icon="add" onPress={() => setLines((ls) => [...ls, ''])} style={{ alignSelf: 'flex-start' }} />
      ) : null}
      <Divider />
      <Field
        label={t('music.interval')}
        value={interval}
        onChangeText={(s) => setIntervalSec(s.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        error={!ivOk ? t('music.intervalInvalid') : null}
        testID="announce-interval"
      />
      {changed ? (
        <Button
          label={t('common.save')}
          small
          disabled={!ivOk}
          loading={busy}
          style={{ alignSelf: 'flex-start' }}
          testID="announce-save"
          onPress={() => run(() => music.setAnnouncements(id, lines.map((l) => l.trim()).filter(Boolean), iv), t('common.saved'))}
        />
      ) : null}
    </View>
  );
}

export function PlaybackEditor({ id, settings }: P) {
  const { busy, run } = useBotChange('music', id);
  const [maxSong, setMaxSong] = useState(String(settings.max_song_minutes));
  const [autoplay, setAutoplay] = useState(settings.autoplay);
  useEffect(() => setMaxSong(String(settings.max_song_minutes)), [settings.max_song_minutes]);
  useEffect(() => setAutoplay(settings.autoplay), [settings.autoplay]);
  const ms = Number(maxSong);
  const msOk = Number.isFinite(ms) && ms >= 1;
  const changed = ms !== settings.max_song_minutes || autoplay !== settings.autoplay;
  return (
    <View style={{ gap: S.md }}>
      <Field
        label={t('music.maxSong')}
        value={maxSong}
        onChangeText={(s) => setMaxSong(s.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        error={!msOk ? t('music.maxSongInvalid') : null}
        testID="max-song"
      />
      <Toggle label={t('music.autoplay')} hint={t('music.autoplayHint')} value={autoplay} onChange={setAutoplay} />
      {changed ? (
        <Button
          label={t('common.save')}
          small
          disabled={!msOk}
          loading={busy}
          style={{ alignSelf: 'flex-start' }}
          testID="playback-save"
          onPress={() => run(() => music.setSettings(id, { max_song_minutes: ms, autoplay }), t('common.saved'))}
        />
      ) : null}
    </View>
  );
}

// „Wo er steht“ – Bot-Platz kinderleicht setzen (für alle drei Bot-Arten):
//   1. großer Knopf „📍 Bot zu mir holen“ (POST …/position/to_me): im Raum hinstellen → antippen → der Bot kommt und merkt sich die Stelle
//   2. oder im Raum-Chat `-here` schreiben
//   3. Blickrichtung: 4 große Pfeil-Knöpfe (wie der Raum von oben; nie gespiegelt, auch nicht bei Arabisch)
//   4. genaue Zahlen x/y/z nur unter „Experten-Einstellungen“ (Zahlen-Tastatur, Prüfung, sinnvolle Grenzen)
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  bots, ApiError, COORD_LIMITS, type Bot, type BotDetail, type Facing, type Position, type UpdateBotInput,
} from '@/api';
import { keys, putBot, queryClient, usePending } from '@/lib/query';
import { errorText, t, type Key } from '@/lib/i18n';
import { haptic, openRoom } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { alpha, C, glow, KIND_COLOR, KIND_EMOJI, mono, PRIMARY_GRADIENT, R, S, T } from '@/lib/theme';
import { Button, Card, CodeChip, Field, SectionTitle, Txt } from '../ui';
import { Expandable } from '../guide';
import { PowerButton } from '../BotCard';
import { FACING_ARROW } from './meta';

// ---------------------------------------------------------------- Zahlen
export const num = (s: string) => (s.trim() === '' || s.trim() === '-' ? NaN : Number(s.replace(',', '.')));
export const numText = (s: string) => s.replace(/[^0-9.,]/g, '').slice(0, 7);

export type Axis = 'x' | 'y' | 'z';
/** Fehlertext für eine Koordinate (leer = noch nichts eingetragen → kein Fehler) */
export function coordError(s: string, axis: Axis): string | null {
  if (!s.trim()) return null;
  const v = num(s);
  if (!Number.isFinite(v)) return t('spot.bad', { axis: axis.toUpperCase() });
  const L = axis === 'y' ? COORD_LIMITS.y : COORD_LIMITS.xz;
  if (v < L.min || v > L.max) return t('spot.range', { axis: axis.toUpperCase(), min: L.min, max: L.max });
  return null;
}
/** alle Felder ausgefüllt und gültig */
export function coordsOk(v: Partial<Record<Axis, string>>) {
  return (Object.entries(v) as [Axis, string][]).every(([a, s]) => !!s.trim() && !coordError(s, a));
}
const fmtCoord = (n: number) => String(Math.round(n * 100) / 100);

/** Drei (oder zwei) Zahlenfelder X · Y · Z – immer links→rechts, Zahlen-Tastatur, Fehler unter der Zeile */
export function XYZ({ x, y, z, setX, setY, setZ, testID, noY }: {
  x: string; y?: string; z: string; setX: (s: string) => void; setY?: (s: string) => void; setZ: (s: string) => void; testID?: string; noY?: boolean;
}) {
  const fields: [Axis, string, string, (s: string) => void][] = noY
    ? [['x', 'X', x, setX], ['z', 'Z', z, setZ]]
    : [['x', 'X', x, setX], ['y', t('spot.y'), y ?? '', setY ?? (() => {})], ['z', 'Z', z, setZ]];
  const errors = fields.map(([a, , v]) => coordError(v, a)).filter((e): e is string => !!e);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: S.sm, direction: 'ltr' }}>
        {fields.map(([a, l, v, set]) => (
          <Field
            key={a}
            style={{ flex: 1 }}
            label={l}
            value={v}
            onChangeText={(s) => set(numText(s))}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
            ltr
            invalid={!!coordError(v, a)}
            accessibilityLabel={`${l} (${a === 'y' ? `${COORD_LIMITS.y.min}–${COORD_LIMITS.y.max}` : `${COORD_LIMITS.xz.min}–${COORD_LIMITS.xz.max}`})`}
            testID={testID ? `${testID}-${a}` : undefined}
          />
        ))}
      </View>
      {errors.length ? (
        errors.map((e) => <Txt key={e} style={[T.sub, { color: C.red, fontWeight: '600' }]}>⚠️ {e}</Txt>)
      ) : (
        <Txt style={T.caption}>{noY ? t('spot.hintFloor') : t('spot.hint')}</Txt>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Speichern
/** Bot-Grunddaten speichern (Name, Raum, Schlüssel, Platz, Motor) */
export function useSaveBot(bot: Bot) {
  const [busy, setBusy] = useState<string | null>(null);
  const save = async (what: string, patch: UpdateBotInput, okText: string | null = t('common.saved')) => {
    setBusy(what);
    try {
      const b = await bots.update(bot.kind, bot.id, patch);
      putBot(b);
      await queryClient.invalidateQueries({ queryKey: keys.bot(bot.kind, bot.id) });
      haptic.success();
      if (okText) toast(okText, 'success');
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

/** Neue Stelle sofort in den Bot-Daten zeigen (bevor der Server neu geladen ist) */
function setCachedPosition(bot: Bot, position: Position) {
  queryClient.setQueryData<BotDetail>(keys.bot(bot.kind, bot.id), (d) => (d ? ({ ...d, settings: { ...d.settings, position } } as BotDetail) : d));
}

// ---------------------------------------------------------------- Genaue Zahlen (Experten)
export function SpotEditor({ d }: { d: BotDetail }) {
  const { bot, settings } = d;
  const { busy, save } = useSaveBot(bot);
  const p = settings.position;
  const [x, setX] = useState(fmtCoord(p.x));
  const [y, setY] = useState(fmtCoord(p.y));
  const [z, setZ] = useState(fmtCoord(p.z));
  useEffect(() => { setX(fmtCoord(p.x)); setY(fmtCoord(p.y)); setZ(fmtCoord(p.z)); }, [p.x, p.y, p.z]);
  const valid = coordsOk({ x, y, z });
  const changed = num(x) !== p.x || num(y) !== p.y || num(z) !== p.z;
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.sub}>{t('spot.sub')}</Txt>
      <XYZ x={x} y={y} z={z} setX={setX} setY={setY} setZ={setZ} testID="pos" />
      {changed ? (
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Button label={t('common.save')} small style={{ flex: 1 }} disabled={!valid} loading={busy === 'pos'} testID="save-pos"
            onPress={() => save('pos', { position: { x: num(x), y: num(y), z: num(z), facing: p.facing } })} />
          <Button label={t('common.cancel')} small variant="secondary" style={{ flex: 1 }}
            onPress={() => { setX(fmtCoord(p.x)); setY(fmtCoord(p.y)); setZ(fmtCoord(p.z)); }} />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- Blickrichtung
// Raster wie der Raum von oben/schräg gesehen: oben = hinten, unten = vorne (zur Kamera). Nie gespiegelt.
const FACING_GRID: Facing[][] = [['BackLeft', 'BackRight'], ['FrontLeft', 'FrontRight']];
const FACING_ROT: Record<Facing, string> = { BackLeft: '-45deg', BackRight: '45deg', FrontRight: '135deg', FrontLeft: '-135deg' };

export function FacingPicker({ value, onChange, busy, color, botEmoji, testID }: {
  value: Facing; onChange: (f: Facing) => void; busy?: Facing | null; color: string; botEmoji: string; testID?: string;
}) {
  return (
    <View style={{ direction: 'ltr', gap: S.sm }} accessibilityRole="radiogroup" testID={testID}>
      {FACING_GRID.map((row) => (
        <View key={row.join()} style={{ flexDirection: 'row', gap: S.sm }}>
          {row.map((f) => {
            const on = f === value;
            const label = t(`facing.${f}` as Key);
            return (
              <Pressable
                key={f}
                testID={testID ? `${testID}-${f}` : undefined}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, busy: busy === f }}
                accessibilityLabel={`${FACING_ARROW[f]} ${label}`}
                disabled={!!busy}
                onPress={() => {
                  if (on) return;
                  haptic.select();
                  onChange(f);
                }}
                style={({ pressed }) => [
                  {
                    flex: 1, minHeight: 104, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', gap: 6, padding: S.sm,
                    backgroundColor: on ? alpha(color, 0.2) : pressed ? C.cardPressed : C.card, borderWidth: 2, borderColor: on ? color : C.cardBorder,
                  },
                  on ? glow(color, 0.35) : null,
                ]}
              >
                {busy === f ? (
                  <ActivityIndicator color={color} />
                ) : (
                  <Ionicons name="arrow-up" size={40} color={on ? color : C.text2} style={{ transform: [{ rotate: FACING_ROT[f] }] }} />
                )}
                <Txt style={[T.sub, { color: on ? C.text : C.text2, fontWeight: on ? '800' : '600', textAlign: 'center' }]} numberOfLines={2}>{label}</Txt>
              </Pressable>
            );
          })}
        </View>
      ))}
      {/* der Bot in der Mitte – die Pfeile zeigen von ihm weg */}
      <View pointerEvents="none" style={{ position: 'absolute', top: '50%', left: '50%', marginTop: -26, marginLeft: -26, width: 52, height: 52, borderRadius: 26, backgroundColor: C.bg2, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 24 }} maxFontSizeMultiplier={1}>{botEmoji}</Txt>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Seite „Wo er steht“
type Result = { phase: 'idle' } | { phase: 'busy' } | { phase: 'ok'; pos: Position } | { phase: 'err'; code: string; text: string };
const ERR_EMOJI: Record<string, string> = { not_running: '😴', highrise_not_linked: '🔗', owner_not_in_room: '🙈', bot_not_in_room: '💤', timeout: '⏳' };
const STAND_ERRORS = ['not_running', 'highrise_not_linked', 'owner_not_in_room', 'bot_not_in_room', 'timeout', 'agent_error'];

export function StandPage({ d }: { d: BotDetail }) {
  const { bot, settings } = d;
  const p = settings.position;
  const color = KIND_COLOR[bot.kind];
  const { busy, save } = useSaveBot(bot);
  const [facingBusy, setFacingBusy] = useState<Facing | null>(null);
  const [res, setRes] = useState<Result>({ phase: 'idle' });
  const pending = usePending(bot.kind, bot.id);
  const off = bot.status !== 'running' && !pending;
  const roomUrl = bot.room_url || `https://high.rs/room?id=${bot.room_id}`;
  // „Bot ist aus“-Meldung verschwindet, sobald er an ist
  useEffect(() => {
    if (bot.status === 'running') setRes((r) => (r.phase === 'err' && r.code === 'not_running' ? { phase: 'idle' } : r));
  }, [bot.status]);

  const bring = async () => {
    if (res.phase === 'busy') return;
    haptic.medium();
    setRes({ phase: 'busy' });
    try {
      const pos = await bots.positionToMe(bot.kind, bot.id);
      haptic.success();
      setCachedPosition(bot, pos);
      queryClient.invalidateQueries({ queryKey: keys.bot(bot.kind, bot.id) });
      setRes({ phase: 'ok', pos });
    } catch (e) {
      haptic.error();
      const code = e instanceof ApiError ? e.code : '';
      // „Bot ist aus“: Stand neu holen, damit der AN/AUS-Knopf stimmt
      if (code === 'not_running') queryClient.invalidateQueries({ queryKey: keys.bot(bot.kind, bot.id) });
      setRes({ phase: 'err', code, text: STAND_ERRORS.includes(code) ? t(`stand.err.${code}` as Key) : errorText(e) });
    }
  };

  const pickFacing = async (f: Facing) => {
    setFacingBusy(f);
    // sofort zeigen, beim Fehler zurück
    setCachedPosition(bot, { ...p, facing: f });
    const ok = await save('facing', { position: { ...p, facing: f } }, t('stand.facingSaved'));
    if (!ok) setCachedPosition(bot, p);
    setFacingBusy(null);
  };

  const errCode = res.phase === 'err' ? res.code : null;
  return (
    <>
      {/* ---------- 1. Bot zu mir holen ---------- */}
      <Card style={{ gap: S.lg, borderColor: alpha(color, 0.5) }}>
        <Txt style={[T.headline, { color: color }]} accessibilityRole="header">✨ {t('stand.toMeSub')}</Txt>
        <Step n={1} pic="🏠🚶" text={t('stand.step1')}>
          <Button label={t('stand.openRoom')} emoji="🚪" variant="secondary" small onPress={() => openRoom(roomUrl)} testID="stand-room" />
        </Step>
        <Step n={2} pic="👆📍" text={t('stand.step2')} />

        {off && errCode !== 'not_running' ? (
          <View style={{ gap: S.sm }} testID="stand-off">
            <Txt style={[T.body, { color: C.orange, fontWeight: '700' }]}>😴 {t('stand.offFirst')}</Txt>
            <PowerButton bot={bot} testID="stand-power" />
          </View>
        ) : null}

        <BigButton
          label={t('stand.toMeTitle')}
          busyLabel={t('stand.moving')}
          busy={res.phase === 'busy'}
          onPress={bring}
          testID="stand-tome"
        />

        {res.phase === 'ok' ? (
          <View style={{ backgroundColor: C.greenSoft, borderRadius: R.lg, borderWidth: 1, borderColor: alpha(C.green, 0.5), padding: S.lg, gap: S.sm, alignItems: 'center' }} testID="stand-ok" accessibilityLiveRegion="polite">
            <Txt style={{ fontSize: 44 }} maxFontSizeMultiplier={1.2}>🎉</Txt>
            <Txt style={[T.big, { textAlign: 'center' }]}>{t('stand.okTitle')}</Txt>
            <Txt style={[T.callout, { textAlign: 'center' }]}>{t('stand.okText')}</Txt>
            <Txt style={[T.caption, { textAlign: 'center' }]}>{t('stand.okSpot')}</Txt>
            <Txt style={{ fontFamily: mono, fontSize: 15, color: C.text, textAlign: 'center', writingDirection: 'ltr' }} testID="stand-ok-spot">
              {`X ${fmtCoord(res.pos.x)} · Y ${fmtCoord(res.pos.y)} · Z ${fmtCoord(res.pos.z)}`}
            </Txt>
          </View>
        ) : null}

        {res.phase === 'err' ? (
          <View style={{ backgroundColor: C.orangeSoft, borderRadius: R.lg, borderWidth: 1, borderColor: alpha(C.orange, 0.6), padding: S.lg, gap: S.md }} testID={`stand-err-${res.code || 'other'}`} accessibilityLiveRegion="polite">
            <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' }}>
              <Txt style={{ fontSize: 28 }} maxFontSizeMultiplier={1.2}>{ERR_EMOJI[res.code] ?? '😕'}</Txt>
              <Txt style={[T.body, { flex: 1, fontWeight: '600', lineHeight: 24 }]}>{res.text}</Txt>
            </View>
            {res.code === 'not_running' ? <PowerButton bot={bot} testID="stand-err-power" /> : null}
            {res.code === 'highrise_not_linked' ? (
              <Button label={t('wallet.link')} emoji="🤝" onPress={() => router.push('/link')} testID="stand-link" />
            ) : null}
            {res.code === 'owner_not_in_room' || res.code === 'bot_not_in_room' ? (
              <Button label={t('stand.openRoom')} emoji="🚪" onPress={() => openRoom(roomUrl)} testID="stand-err-room" />
            ) : null}
            {res.code !== 'not_running' && res.code !== 'highrise_not_linked' ? (
              <Button label={t('common.retry')} emoji="🔄" variant="secondary" small onPress={bring} testID="stand-retry" />
            ) : null}
          </View>
        ) : null}
      </Card>

      {/* ---------- 2. oder im Chat ---------- */}
      <Card style={{ gap: S.md }}>
        <Txt style={T.headline}>💬 {t('stand.chatTitle')}</Txt>
        <CodeChip text="-here" />
        <Txt style={T.callout}>{t('stand.chatText')}</Txt>
      </Card>

      {/* ---------- 3. Blickrichtung ---------- */}
      <SectionTitle title={t('stand.facing')} />
      <FacingPicker value={p.facing} onChange={pickFacing} busy={facingBusy ?? (busy === 'facing' ? p.facing : null)} color={color} botEmoji={KIND_EMOJI[bot.kind]} testID="facing" />
      <Txt style={[T.caption, { textAlign: 'center' }]}>{t('stand.facingHint')}</Txt>

      {/* ---------- 4. genaue Zahlen (nur für Experten) ---------- */}
      <Expandable title={`${t('page.expert')}: ${t('expert.spot')}`} emoji="🧰" testID="stand-expert">
        <SpotEditor d={d} />
      </Expandable>
    </>
  );
}

function Step({ n, pic, text, children }: { n: number; pic: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
      <View>
        <View style={{ width: 84, height: 64, borderRadius: R.lg, backgroundColor: C.card2, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontSize: 26, textAlign: 'center', writingDirection: 'ltr' }} numberOfLines={1} maxFontSizeMultiplier={1}>{pic}</Txt>
        </View>
        <View style={{ position: 'absolute', top: -8, start: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card }}>
          <Txt style={{ color: C.onAccent, fontWeight: '800', fontSize: 14, textAlign: 'center' }} maxFontSizeMultiplier={1}>{n}</Txt>
        </View>
      </View>
      <View style={{ flex: 1, gap: S.sm, paddingTop: 4 }}>
        <Txt style={[T.body, { fontWeight: '600', lineHeight: 24 }]}>{text}</Txt>
        {children}
      </View>
    </View>
  );
}

/** riesiger Haupt-Knopf (Verlauf Cyan→Lime), beim Warten mit Rädchen + Text */
function BigButton({ label, busyLabel, busy, onPress, testID }: { label: string; busyLabel: string; busy: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={busy ? busyLabel : label}
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        { minHeight: 88, borderRadius: R.xl, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: S.sm, paddingHorizontal: S.md, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        glow(C.accent, 0.5),
      ]}
    >
      <LinearGradient colors={PRIMARY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.2 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: R.xl }} />
      {busy ? <ActivityIndicator color={C.onAccent} size="large" /> : <Txt style={{ fontSize: 34 }} maxFontSizeMultiplier={1.1}>📍</Txt>}
      <Txt style={[T.big, { color: C.onAccent, fontSize: 20, textAlign: 'center', flexShrink: 1 }]} numberOfLines={2}>{busy ? busyLabel : label}</Txt>
    </Pressable>
  );
}

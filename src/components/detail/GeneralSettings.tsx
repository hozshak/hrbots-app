// Allgemeine Einstellungen jedes Bots, aufgeteilt in drei Abschnitte: Name & Raum · Geheimer Schlüssel · Position.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bots, isBotToken, parseRoom, FACINGS, type Bot, type BotDetail, type Facing, type UpdateBotInput } from '@/api';
import { keys, putBot, queryClient } from '@/lib/query';
import { errorText, t, type Key } from '@/lib/i18n';
import { CREATE_HIGHRISE } from '@/lib/content';
import { haptic, openUrl } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, R, S, T } from '@/lib/theme';
import { Button, Divider, Field } from '../ui';
import { HelpBits } from '../guide';

const num = (s: string) => (s.trim() === '' || s.trim() === '-' ? NaN : Number(s.replace(',', '.')));

function useSave(bot: Bot) {
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

export async function pasteText() {
  try {
    return (await Clipboard.getStringAsync()).trim();
  } catch {
    return '';
  }
}

export function NameRoomEditor({ detail }: { detail: BotDetail }) {
  const { bot } = detail;
  const { busy, save } = useSave(bot);
  const [name, setName] = useState(bot.name);
  const [room, setRoom] = useState(bot.room_url || bot.room_id);
  useEffect(() => setName(bot.name), [bot.name]);
  useEffect(() => setRoom(bot.room_url || bot.room_id), [bot.room_url, bot.room_id]);
  const roomCheck = useMemo(() => parseRoom(room), [room]);
  const roomChanged = room.trim() !== (bot.room_url || bot.room_id);
  return (
    <View style={{ gap: S.md }}>
      <Field label={t('detail.name')} value={name} onChangeText={setName} maxLength={40} testID="edit-name" />
      {name.trim() && name.trim() !== bot.name ? (
        <Button label={t('common.save')} small onPress={() => save('name', { name: name.trim() })} loading={busy === 'name'} style={{ alignSelf: 'flex-start' }} testID="save-name" />
      ) : null}
      <Divider />
      <Field
        label={t('detail.room')}
        value={room}
        onChangeText={setRoom}
        autoCapitalize="none"
        keyboardType="url"
        testID="edit-room"
        error={roomChanged && !roomCheck.ok ? t(`room.${roomCheck.reason}` as Key) : null}
        ok={roomChanged && roomCheck.ok ? t('wiz.roomOk') : null}
        right={
          <Pressable accessibilityRole="button" onPress={async () => { const v = await pasteText(); if (v) setRoom(v); }} style={{ paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' }}>
            <Text style={[T.sub, { color: C.accent, fontWeight: '600' }]}>{t('wiz.paste')}</Text>
          </Pressable>
        }
      />
      {roomChanged && roomCheck.ok ? (
        <Button label={t('common.save')} small onPress={() => save('room', { room: room.trim() })} loading={busy === 'room'} style={{ alignSelf: 'flex-start' }} testID="save-room" />
      ) : null}
      <Text style={T.sub}>{t('detail.roomRestart')}</Text>
      <HelpBits guide="roomLink" />
    </View>
  );
}

export function KeyEditor({ detail, startOpen }: { detail: BotDetail; startOpen?: boolean }) {
  const { bot, settings } = detail;
  const { busy, save } = useSave(bot);
  const [open, setOpen] = useState(!!startOpen);
  const [token, setToken] = useState('');
  return (
    <View style={{ gap: S.md }}>
      {!open ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Ionicons name={settings.bot_token_set ? 'checkmark-circle' : 'alert-circle'} size={22} color={settings.bot_token_set ? C.green : C.yellow} />
          <Text style={[T.body, { flex: 1 }]}>{settings.bot_token_set ? t('detail.tokenSaved') : t('detail.tokenNotSet')}</Text>
          <Button label={t('detail.tokenReplace')} small variant="secondary" onPress={() => setOpen(true)} testID="token-replace" />
        </View>
      ) : (
        <View style={{ gap: S.sm }}>
          <Field
            value={token}
            onChangeText={setToken}
            placeholder={t('detail.tokenNew')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            error={token.length > 0 && !isBotToken(token) ? t('new.tokenInvalid') : null}
            ok={isBotToken(token) ? t('wiz.tokenOk') : null}
            hint={t('new.tokenPrivate')}
            testID="token-input"
            right={
              <Pressable accessibilityRole="button" onPress={async () => { const v = await pasteText(); if (v) setToken(v); }} style={{ paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' }}>
                <Text style={[T.sub, { color: C.accent, fontWeight: '600' }]}>{t('wiz.paste')}</Text>
              </Pressable>
            }
          />
          <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
            <Button
              label={t('common.save')}
              small
              disabled={!isBotToken(token)}
              loading={busy === 'token'}
              testID="token-save"
              onPress={async () => {
                if (await save('token', { bot_token: token.trim() }, t('detail.tokenSaved'))) {
                  setToken('');
                  setOpen(false);
                }
              }}
            />
            <Button label={t('wiz.openSite')} small variant="secondary" icon="open-outline" onPress={() => openUrl(CREATE_HIGHRISE)} />
            <Button label={t('common.cancel')} small variant="ghost" onPress={() => { setToken(''); setOpen(false); }} />
          </View>
        </View>
      )}
      <Text style={T.sub}>{t('detail.roomRestart')}</Text>
      <HelpBits guide="token" />
    </View>
  );
}

export function PositionEditor({ detail }: { detail: BotDetail }) {
  const { bot, settings } = detail;
  const { busy, save } = useSave(bot);
  const p = settings.position;
  const [x, setX] = useState(p ? String(p.x) : '');
  const [y, setY] = useState(p ? String(p.y) : '');
  const [z, setZ] = useState(p ? String(p.z) : '');
  const [facing, setFacing] = useState<Facing>(p?.facing ?? 'FrontRight');
  const posValid = [x, y, z].every((v) => Number.isFinite(num(v)));
  const posChanged = !p ? [x, y, z].some((v) => v.trim() !== '') : num(x) !== p.x || num(y) !== p.y || num(z) !== p.z || facing !== p.facing;
  return (
    <View style={{ gap: S.md }}>
      <Text style={T.sub}>{t('detail.positionHint')}</Text>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        {([['x', x, setX], ['y', y, setY], ['z', z, setZ]] as const).map(([l, v, set]) => (
          <Field
            key={l}
            style={{ flex: 1 }}
            label={l.toUpperCase()}
            value={v}
            onChangeText={(s) => set(s.replace(/[^0-9.,-]/g, ''))}
            keyboardType="numbers-and-punctuation"
            placeholder="0"
            testID={`pos-${l}`}
          />
        ))}
      </View>
      <Text style={T.sub}>{t('detail.facing')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {FACINGS.map((f) => {
          const on = f === facing;
          return (
            <Pressable
              key={f}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => { haptic.select(); setFacing(f); }}
              style={{
                flexBasis: '47%', flexGrow: 1, minHeight: 44, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? C.accentSoft : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: on ? C.accent : 'transparent',
              }}
            >
              <Text style={[T.sub, { color: on ? C.text : C.text2, fontWeight: on ? '600' : '500' }]}>{t(`facing.${f}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      {posChanged ? (
        <Button
          label={t('common.save')}
          small
          disabled={!posValid}
          loading={busy === 'pos'}
          onPress={() => save('pos', { position: { x: num(x), y: num(y), z: num(z), facing } })}
          style={{ alignSelf: 'flex-start' }}
          testID="save-pos"
        />
      ) : null}
    </View>
  );
}

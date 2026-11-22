// Moderations-Bot: Team-Rollen, verbotene Wörter mit Aktion, Willkommensnachrichten, Teleport-Ziele – je ein Abschnitt.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { mod, BANNED_ACTIONS, INPUT_LIMITS, MIN_ROLES, type BannedAction, type MinRole, type ModRole, type ModSettings as MS } from '@/api';
import { t } from '@/lib/i18n';
import { content } from '@/lib/content';
import { confirm } from '@/lib/ui';
import { C, S, T } from '@/lib/theme';
import { Button, Field, Segmented } from '../ui';
import { AddMessage, ItemRow, RoleEditor, TemplateChips, useBotChange } from '../editors';

const ACTION_COLOR: Record<BannedAction, string> = { warn: C.yellow, mute: '#4fb3ff', kick: '#ff9f43', ban: C.red };
const num = (s: string) => Number(s.replace(',', '.'));
type P = { id: number; settings: MS };

export function ModRolesEditor({ id, settings }: P) {
  const { busy, run } = useBotChange('mod', id);
  return (
    <RoleEditor<ModRole>
      roles={settings.roles}
      labels={{ admin: t('mod.role.admin'), moderator: t('mod.role.moderator'), vip: t('mod.role.vip') }}
      busy={busy}
      onAdd={(r, u) => run(() => mod.addRole(id, r, u))}
      onRemove={(r, u) => run(() => mod.removeRole(id, r, u))}
    />
  );
}

export function BannedWordsEditor({ id, settings }: P) {
  const { busy, run } = useBotChange('mod', id);
  const [word, setWord] = useState('');
  const [action, setAction] = useState<BannedAction>('warn');
  return (
    <View>
      {settings.banned_words.length === 0 ? <Text style={T.sub}>{t('common.none')}</Text> : null}
      {settings.banned_words.map((w) => (
        <ItemRow
          key={w.word}
          title={w.word}
          right={<Text style={[T.sub, { color: ACTION_COLOR[w.action], fontWeight: '600' }]}>{t(`mod.action.${w.action}`)}</Text>}
          onDelete={() => run(() => mod.removeBannedWord(id, w.word))}
        />
      ))}
      <View style={{ gap: S.sm, marginTop: S.md }}>
        <Field value={word} onChangeText={setWord} placeholder={t('mod.word')} autoCapitalize="none" maxLength={INPUT_LIMITS.word} testID="banned-word" />
        <Text style={T.sub}>{t('mod.bannedHint')}</Text>
        <Segmented<BannedAction> value={action} onChange={setAction} options={BANNED_ACTIONS.map((a) => ({ value: a, label: t(`mod.action.${a}`) }))} />
        <Button
          label={t('common.add')}
          small
          icon="add"
          variant="secondary"
          disabled={!word.trim()}
          loading={busy}
          style={{ alignSelf: 'flex-start' }}
          testID="banned-add"
          onPress={async () => { if (await run(() => mod.addBannedWord(id, word.trim(), action))) setWord(''); }}
        />
      </View>
    </View>
  );
}

export function ModWelcomesEditor({ id, settings }: P) {
  const { busy, run } = useBotChange('mod', id);
  const existing = new Set(settings.welcomes.map((w) => w.message));
  return (
    <View>
      <Text style={[T.sub, { marginBottom: S.sm }]}>{t('welcome.messagesHint')}</Text>
      {settings.welcomes.length === 0 ? <Text style={T.sub}>{t('common.none')}</Text> : null}
      {settings.welcomes.map((w) => (
        <ItemRow
          key={w.id}
          title={w.message}
          subtitle={w.target_username ? t('welcome.forUser', { user: w.target_username }) : undefined}
          onDelete={async () => { if (await confirm(t('common.delete'), w.message, t('common.delete'))) run(() => mod.removeWelcome(id, w.id)); }}
        />
      ))}
      <TemplateChips templates={content.templates.filter((x) => !existing.has(x))} onPick={(x) => run(() => mod.addWelcome(id, x))} />
      <AddMessage placeholder={t('new.messagePlaceholder')} busy={busy} onAdd={(msg, target) => run(() => mod.addWelcome(id, msg, target))} />
    </View>
  );
}

export function DestinationsEditor({ id, settings }: P) {
  const { busy, run } = useBotChange('mod', id);
  const [dName, setDName] = useState('');
  const [dx, setDx] = useState('');
  const [dy, setDy] = useState('');
  const [dz, setDz] = useState('');
  const [minRole, setMinRole] = useState<MinRole>('everyone');
  const coordsOk = [dx, dy, dz].every((v) => v.trim() !== '' && Number.isFinite(num(v)));
  return (
    <View>
      <Text style={[T.sub, { marginBottom: S.sm }]}>{t('mod.destHint')}</Text>
      {settings.destinations.length === 0 ? <Text style={T.sub}>{t('common.none')}</Text> : null}
      {settings.destinations.map((d) => (
        <ItemRow key={d.id} title={d.name} subtitle={`${d.x}, ${d.y}, ${d.z} · ${t(`minrole.${d.min_role}`)}`} onDelete={() => run(() => mod.removeDestination(id, d.id))} />
      ))}
      <View style={{ gap: S.sm, marginTop: S.md }}>
        <Field value={dName} onChangeText={setDName} placeholder={t('mod.destName')} autoCapitalize="none" maxLength={INPUT_LIMITS.destName} testID="dest-name" />
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {([['x', dx, setDx], ['y', dy, setDy], ['z', dz, setDz]] as const).map(([l, v, set]) => (
            <Field key={l} style={{ flex: 1 }} value={v} placeholder={l.toUpperCase()} keyboardType="numbers-and-punctuation" onChangeText={(s) => set(s.replace(/[^0-9.,-]/g, ''))} testID={`dest-${l}`} />
          ))}
        </View>
        <Text style={T.sub}>{t('mod.minRole')}</Text>
        <Segmented<MinRole> value={minRole} onChange={setMinRole} options={MIN_ROLES.map((r) => ({ value: r, label: t(`minrole.${r}`) }))} />
        <Button
          label={t('common.add')}
          small
          icon="add"
          variant="secondary"
          disabled={!dName.trim() || !coordsOk}
          loading={busy}
          style={{ alignSelf: 'flex-start' }}
          testID="dest-add"
          onPress={async () => {
            const ok = await run(() => mod.addDestination(id, { name: dName.trim(), x: num(dx), y: num(dy), z: num(dz), min_role: minRole }));
            if (ok) { setDName(''); setDx(''); setDy(''); setDz(''); setMinRole('everyone'); }
          }}
        />
      </View>
    </View>
  );
}

// Wiederverwendbare Bearbeiter für Listen (Benutzer, Rollen, Nachrichten) in den Bot-Einstellungen.
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cleanUsername, isUsername, INPUT_LIMITS, type BotKind } from '@/api';
import { keys, queryClient } from '@/lib/query';
import { errorText, t } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { C, S, T } from '@/lib/theme';
import { Button, Chip, Field, Segmented } from './ui';

/** Änderung an einem Bot ausführen: Fehler als Meldung, danach Bot-Daten neu laden. */
export function useBotChange(kind: BotKind, id: number) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: () => Promise<unknown>, okText?: string) => {
      setBusy(true);
      try {
        await fn();
        await queryClient.invalidateQueries({ queryKey: keys.bot(kind, id) });
        if (okText) toast(okText, 'success');
        return true;
      } catch (e) {
        toast(errorText(e), 'error');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [kind, id],
  );
  return { busy, run };
}

// Server nimmt nur Highrise-Namen [a-z0-9._-] (1–40) an; hier vorher prüfen statt 400 invalid_input.
const cleanUser = cleanUsername;

export function UserList({ users, onAdd, onRemove, busy }: {
  users: string[]; onAdd: (u: string) => Promise<boolean>; onRemove: (u: string) => void; busy?: boolean;
}) {
  const [name, setName] = useState('');
  const u = cleanUser(name);
  const bad = !!u && !isUsername(u);
  const add = async () => {
    if (!u || bad) return;
    if (await onAdd(u)) setName('');
  };
  return (
    <View style={{ gap: S.md }}>
      {users.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {users.map((u) => (
            <Chip key={u} label={`@${u}`} onRemove={() => onRemove(u)} />
          ))}
        </View>
      ) : (
        <Text style={T.sub}>{t('common.none')}</Text>
      )}
      <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' }}>
        <Field
          style={{ flex: 1 }}
          value={name}
          onChangeText={setName}
          placeholder={t('common.username')}
          autoCapitalize="none"
          maxLength={INPUT_LIMITS.username + 1}
          returnKeyType="done"
          onSubmitEditing={add}
          error={bad ? t('common.usernameInvalid') : null}
        />
        <Button label={t('common.add')} small variant="secondary" icon="add" onPress={add} disabled={!u || bad} loading={busy} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function RoleEditor<R extends string>({ roles, labels, onAdd, onRemove, busy }: {
  roles: Record<R, string[]>; labels: Record<R, string>; onAdd: (role: R, u: string) => Promise<boolean>; onRemove: (role: R, u: string) => void; busy?: boolean;
}) {
  const list = Object.keys(labels) as R[];
  const [role, setRole] = useState<R>(list[0]);
  return (
    <View style={{ gap: S.md }}>
      <Segmented
        value={role}
        onChange={setRole}
        options={list.map((r) => ({ value: r, label: `${labels[r]} · ${roles[r]?.length ?? 0}` }))}
      />
      <UserList users={roles[role] ?? []} onAdd={(u) => onAdd(role, u)} onRemove={(u) => onRemove(role, u)} busy={busy} />
    </View>
  );
}

/** Liste von Texten mit Löschen-Knopf je Zeile (z. B. Willkommensnachrichten des Mod-Bots) */
export function ItemRow({ title, subtitle, onDelete, right }: { title: string; subtitle?: string; onDelete?: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 52, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.separator }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={T.body}>{title}</Text>
        {subtitle ? <Text style={T.sub}>{subtitle}</Text> : null}
      </View>
      {right}
      {onDelete ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} hitSlop={10} onPress={onDelete} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}>
          <Ionicons name="trash-outline" size={20} color={C.red} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AddMessage({ placeholder, onAdd, busy, withTarget = true }: {
  placeholder: string; onAdd: (message: string, target?: string) => Promise<boolean>; busy?: boolean; withTarget?: boolean;
}) {
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState('');
  const targetBad = !!cleanUser(target) && !isUsername(target);
  const add = async () => {
    if (!msg.trim() || targetBad) return;
    if (await onAdd(msg.trim(), cleanUser(target) || undefined)) {
      setMsg('');
      setTarget('');
    }
  };
  return (
    <View style={{ gap: S.sm, marginTop: S.md }}>
      <Field value={msg} onChangeText={setMsg} placeholder={placeholder} multiline maxLength={INPUT_LIMITS.message} />
      {withTarget ? (
        <Field value={target} onChangeText={setTarget} placeholder={t('welcome.target')} autoCapitalize="none" maxLength={INPUT_LIMITS.username + 1} error={targetBad ? t('common.usernameInvalid') : null} />
      ) : null}
      <Button label={t('common.add')} small icon="add" variant="secondary" onPress={add} disabled={!msg.trim() || targetBad} loading={busy} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}

/** fertige Texte zum Antippen (z. B. Willkommensnachrichten) */
export function TemplateChips({ templates, onPick, title }: { templates: string[]; onPick: (text: string) => void; title?: string }) {
  if (!templates.length) return null;
  return (
    <View style={{ gap: S.sm, marginTop: S.md }}>
      <Text style={T.sub}>{title ?? t('wiz.templates')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {templates.map((x) => (
          <Pressable
            key={x}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.add')}: ${x}`}
            onPress={() => onPick(x)}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: 20,
              backgroundColor: pressed ? 'rgba(110,123,255,0.30)' : C.accentSoft, borderWidth: 1, borderColor: 'rgba(110,123,255,0.35)',
            })}
          >
            <Ionicons name="add" size={16} color={C.accent} />
            <Text style={[T.sub, { color: C.text }]}>{x}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

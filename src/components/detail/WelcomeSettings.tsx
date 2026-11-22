// Willkommens-Bot: Nachrichten (an/aus, bearbeiten, löschen, nur für einen Nutzer, fertige Vorlagen) und Helfer (Bot-Admins).
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { welcome, type WelcomeMessage, type WelcomeSettings as WS } from '@/api';
import { t } from '@/lib/i18n';
import { content } from '@/lib/content';
import { confirm } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, S, T } from '@/lib/theme';
import { AppSwitch, Button, Field } from '../ui';
import { AddMessage, TemplateChips, UserList, useBotChange } from '../editors';

function MessageRow({ m, onToggle, onSave, onDelete }: {
  m: WelcomeMessage; onToggle: (v: boolean) => void; onSave: (text: string) => Promise<boolean>; onDelete: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(m.message);
  return (
    <View style={{ paddingVertical: S.sm, borderBottomWidth: 0.5, borderBottomColor: C.separator, gap: S.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Pressable style={{ flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' }} onPress={() => { setText(m.message); setEdit((v) => !v); }} accessibilityRole="button">
          <Text style={[T.body, !m.active && { color: C.text3 }]}>{m.message}</Text>
          {m.target_username ? <Text style={T.sub}>{t('welcome.forUser', { user: m.target_username })}</Text> : null}
        </Pressable>
        <AppSwitch value={m.active} onChange={onToggle} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} hitSlop={10} onPress={onDelete} style={{ padding: 6 }}>
          <Ionicons name="trash-outline" size={20} color={C.red} />
        </Pressable>
      </View>
      {edit ? (
        <View style={{ gap: S.sm }}>
          <Field value={text} onChangeText={setText} multiline maxLength={200} autoFocus />
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Button label={t('common.save')} small disabled={!text.trim() || text.trim() === m.message} onPress={async () => { if (await onSave(text.trim())) setEdit(false); }} />
            <Button label={t('common.cancel')} small variant="ghost" onPress={() => setEdit(false)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function WelcomeMessagesEditor({ id, settings }: { id: number; settings: WS }) {
  const { busy, run } = useBotChange('welcome', id);
  const existing = new Set(settings.messages.map((m) => m.message));
  return (
    <View>
      <Text style={[T.sub, { marginBottom: S.sm }]}>{t('welcome.messagesHint')}</Text>
      {settings.messages.map((m) => (
        <MessageRow
          key={m.id}
          m={m}
          onToggle={(active) => run(() => welcome.updateMessage(id, m.id, { active }))}
          onSave={(message) => run(() => welcome.updateMessage(id, m.id, { message }), t('common.saved'))}
          onDelete={async () => {
            if (settings.messages.length <= 2) return toast(t('welcome.minTwo'), 'info');
            if (await confirm(t('common.delete'), m.message, t('common.delete'))) run(() => welcome.deleteMessage(id, m.id));
          }}
        />
      ))}
      <TemplateChips templates={content.templates.filter((x) => !existing.has(x))} onPick={(x) => run(() => welcome.addMessage(id, x))} />
      <AddMessage placeholder={t('new.messagePlaceholder')} busy={busy} onAdd={(msg, target) => run(() => welcome.addMessage(id, msg, target))} />
    </View>
  );
}

export function WelcomeAdminsEditor({ id, settings }: { id: number; settings: WS }) {
  const { busy, run } = useBotChange('welcome', id);
  return (
    <View style={{ gap: S.sm }}>
      <Text style={T.sub}>{t('welcome.adminsHint')}</Text>
      <UserList users={settings.admins} busy={busy} onAdd={(u) => run(() => welcome.addAdmin(id, u))} onRemove={(u) => run(() => welcome.removeAdmin(id, u))} />
    </View>
  );
}

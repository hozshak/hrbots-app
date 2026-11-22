// Wiederverwendbare Listen-Bearbeiter: Namen (Helfer, VIPs …) und Nachrichten.
// Muster überall gleich: großer „+“-Knopf → kleines Formular erscheint; Mülleimer mit Nachfrage; Antippen = bearbeiten.
import { useCallback, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { cleanUsername, isUsername, INPUT_LIMITS, type BotKind } from '@/api';
import { keys, queryClient } from '@/lib/query';
import { errorText, t } from '@/lib/i18n';
import { confirm, haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, R, S, T } from '@/lib/theme';
import { AddButton, AppSwitch, Button, Empty, Field, ListItem, Templates, Txt } from './ui';
import { animateLayout } from './guide';

/** Änderung an einem Bot ausführen: Fehler als Meldung, danach Bot-Daten neu laden. */
export function useBotChange(kind: BotKind, id: number, extraKeys: readonly (readonly unknown[])[] = []) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: () => Promise<unknown>, okText: string | null = t('common.saved')) => {
      setBusy(true);
      try {
        await fn();
        haptic.success();
        await Promise.all([queryClient.invalidateQueries({ queryKey: keys.bot(kind, id) }), ...extraKeys.map((k) => queryClient.invalidateQueries({ queryKey: k }))]);
        if (okText) toast(okText, 'success', 1600);
        return true;
      } catch (e) {
        haptic.error();
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

/** „Wirklich löschen?“ */
export const askDelete = (name: string, text?: string) => confirm(t('common.deleteQ', { name }), text ?? t('common.deleteText'), t('common.delete'));

/** Bereich, der sich mit dem großen „+“-Knopf öffnet */
export function AddPanel({ label, open, onOpen, onClose, children, testID }: {
  label: string; open: boolean; onOpen: () => void; onClose: () => void; children: ReactNode; testID?: string;
}) {
  if (!open) return <AddButton label={label} testID={testID} onPress={() => { animateLayout(); onOpen(); }} />;
  return (
    <View style={{ backgroundColor: C.card, borderRadius: R.lg, borderWidth: 2, borderColor: C.accent, padding: S.lg, gap: S.md }}>
      <Txt style={T.headline}>{label}</Txt>
      {children}
      <Button label={t('common.cancel')} variant="ghost" small onPress={() => { animateLayout(); onClose(); }} />
    </View>
  );
}

/** Highrise-Namen-Feld mit Prüfung */
export function NameField({ value, onChange, onSubmit, label, autoFocus, testID }: {
  value: string; onChange: (v: string) => void; onSubmit?: () => void; label?: string; autoFocus?: boolean; testID?: string;
}) {
  const u = cleanUsername(value);
  const bad = !!u && !isUsername(u);
  return (
    <Field
      label={label ?? t('common.username')}
      value={value}
      onChangeText={onChange}
      placeholder={t('common.usernamePh')}
      autoCapitalize="none"
      maxLength={INPUT_LIMITS.username + 1}
      returnKeyType="done"
      onSubmitEditing={onSubmit}
      autoFocus={autoFocus}
      error={bad ? t('common.usernameBad') : null}
      testID={testID}
    />
  );
}

/** Liste von Highrise-Namen mit „+“ und Mülleimer */
export function NameList({ names, onAdd, onRemove, addLabel, emptyEmoji = '🙋', emptyText, busy, testID }: {
  names: string[]; onAdd: (u: string) => Promise<boolean>; onRemove: (u: string) => Promise<unknown>; addLabel: string;
  emptyEmoji?: string; emptyText?: string; busy?: boolean; testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const u = cleanUsername(name);
  const ok = !!u && isUsername(u);
  const add = async () => {
    if (!ok) return;
    if (await onAdd(u)) {
      setName('');
      setOpen(false);
    }
  };
  return (
    <View style={{ gap: S.sm }}>
      {names.length ? (
        names.map((n) => (
          <ListItem
            key={n}
            emoji="🙂"
            title={`@${n}`}
            onDelete={async () => {
              if (await askDelete(`@${n}`)) onRemove(n);
            }}
          />
        ))
      ) : (
        <Empty emoji={emptyEmoji} title={emptyText ?? t('common.nobody')} />
      )}
      <AddPanel label={addLabel} open={open} onOpen={() => setOpen(true)} onClose={() => { setOpen(false); setName(''); }} testID={testID ? `${testID}-add` : 'name-add'}>
        <NameField value={name} onChange={setName} onSubmit={add} autoFocus testID={testID ? `${testID}-input` : 'name-input'} />
        <Button label={t('common.add')} icon="add" onPress={add} disabled={!ok} loading={busy} testID={testID ? `${testID}-save` : 'name-save'} />
      </AddPanel>
    </View>
  );
}

export type MsgItem = { id: number; text: string; target?: string | null; active?: boolean };

/** Nachrichten-Liste: an/aus, antippen = bearbeiten, Mülleimer, „+“ mit Vorlagen und „nur für eine Person“ */
export function MessageList({ items, templates, addLabel, onAdd, onDelete, onToggle, onSave, minCount = 0, withTarget = true, maxLen = INPUT_LIMITS.message, busy }: {
  items: MsgItem[]; templates: string[]; addLabel: string;
  onAdd: (text: string, target?: string) => Promise<boolean>; onDelete: (m: MsgItem) => Promise<unknown>;
  onToggle?: (m: MsgItem, active: boolean) => Promise<unknown>; onSave?: (m: MsgItem, text: string) => Promise<boolean>;
  minCount?: number; withTarget?: boolean; maxLen?: number; busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const tu = cleanUsername(target);
  const targetBad = !!tu && !isUsername(tu);
  const existing = new Set(items.map((m) => m.text));
  const add = async (v = text) => {
    const s = v.trim();
    if (!s || targetBad) return;
    if (await onAdd(s, tu || undefined)) {
      setText('');
      setTarget('');
      setOpen(false);
    }
  };
  return (
    <View style={{ gap: S.sm }}>
      {items.length === 0 ? <Empty emoji="💬" title={t('say.empty')} /> : null}
      {items.map((m) =>
        editing === m.id && onSave ? (
          <View key={m.id} style={{ backgroundColor: C.card, borderRadius: R.md, borderWidth: 2, borderColor: C.accent, padding: S.md, gap: S.sm }}>
            <Field value={editText} onChangeText={setEditText} multiline maxLength={maxLen} autoFocus testID={`msg-edit-${m.id}`} />
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Button
                label={t('common.save')}
                small
                style={{ flex: 1 }}
                disabled={!editText.trim() || editText.trim() === m.text}
                loading={busy}
                onPress={async () => { if (await onSave(m, editText.trim())) setEditing(null); }}
              />
              <Button label={t('common.cancel')} small variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(null)} />
            </View>
          </View>
        ) : (
          <ListItem
            key={m.id}
            emoji={m.active === false ? '💤' : '💬'}
            title={m.text}
            muted={m.active === false}
            sub={m.target ? t('say.onlyFor', { user: m.target }) : m.active === false ? t('say.paused') : null}
            onPress={onSave ? () => { setEditText(m.text); setEditing(m.id); } : undefined}
            right={onToggle ? <AppSwitch value={m.active !== false} onChange={(v) => onToggle(m, v)} label={m.text} /> : null}
            onDelete={async () => {
              if (items.length <= minCount) return toast(t('say.keepMin', { n: minCount }), 'info');
              if (await askDelete(m.text.length > 40 ? m.text.slice(0, 40) + '…' : m.text)) onDelete(m);
            }}
          />
        ),
      )}
      <AddPanel label={addLabel} open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} testID="msg-add">
        <Field value={text} onChangeText={setText} placeholder={t('say.placeholder')} multiline maxLength={maxLen} autoFocus testID="msg-input" />
        <Templates items={templates.filter((x) => !existing.has(x))} onPick={(x) => setText(x)} />
        {withTarget ? (
          <NameField value={target} onChange={setTarget} label={t('say.onlyForLabel')} testID="msg-target" />
        ) : null}
        <Button label={t('common.add')} icon="add" onPress={() => add()} disabled={!text.trim() || targetBad} loading={busy} testID="msg-save" />
      </AddPanel>
    </View>
  );
}

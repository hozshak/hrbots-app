// Neue Nachricht ans Team: Worum geht’s? (Vorlagen) · Welcher Bot? · Text (mind. 10 Zeichen).
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EXTRA_LIMITS, support } from '@/api';
import { keys, queryClient, useBots } from '@/lib/query';
import { content } from '@/lib/content';
import { errorText, t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, KIND_EMOJI, T } from '@/lib/theme';
import { Button, Choice, Field, Screen, Templates, Txt } from '@/components/ui';

export default function NewTicket() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bot?: string }>();
  // Webseite: Bezug nur zu Begrüßer- oder Wächter-Bots möglich
  const botList = (useBots().data ?? []).filter((b) => b.kind !== 'music');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bot, setBot] = useState<string>(params.bot && !params.bot.startsWith('music') ? params.bot : 'none');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = !!subject.trim() && body.trim().length >= EXTRA_LIMITS.ticketBodyMin;
  const send = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const [k, id] = bot === 'none' ? [undefined, undefined] : bot.split(':');
      const tk = await support.create({ subject: subject.trim(), body: body.trim(), ...(k ? { bot_kind: k as 'welcome' | 'mod', bot_id: Number(id) } : {}) });
      haptic.success();
      toast(t('tickets2.sent'), 'success');
      queryClient.invalidateQueries({ queryKey: keys.tickets });
      router.replace({ pathname: '/tickets/[id]', params: { id: String(tk.id) } });
    } catch (e) {
      haptic.error();
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen back keyboard title={`✉️ ${t('tickets2.new')}`} testID="ticket-form">
      <Field label={t('tickets2.subject')} value={subject} onChangeText={setSubject} maxLength={EXTRA_LIMITS.ticketSubject} testID="ticket-subject" />
      <Templates items={content.subjects} onPick={setSubject} />
      {botList.length ? (
        <>
          <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>{t('tickets2.whichBot')}</Txt>
          <Choice<string>
            value={bot}
            onChange={setBot}
            options={[{ value: 'none', label: t('tickets2.noBot'), emoji: '🙂' }, ...botList.map((b) => ({ value: `${b.kind}:${b.id}`, label: b.name, emoji: KIND_EMOJI[b.kind] }))]}
          />
        </>
      ) : null}
      <Field
        label={t('tickets2.message')}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={EXTRA_LIMITS.ticketBody}
        placeholder={t('tickets2.messagePh')}
        hint={body.trim().length < EXTRA_LIMITS.ticketBodyMin ? t('tickets2.min', { n: EXTRA_LIMITS.ticketBodyMin }) : null}
        error={err}
        testID="ticket-body"
      />
      <Button label={t('tickets2.send')} emoji="📨" onPress={send} loading={busy} disabled={!ok} testID="ticket-send" />
    </Screen>
  );
}

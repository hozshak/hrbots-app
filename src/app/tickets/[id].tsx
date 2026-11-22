// Ein Gespräch mit dem Team: Nachrichten als Blasen (meine rechts/am Ende), unten antworten (wenn nicht geschlossen).
import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { EXTRA_LIMITS, support } from '@/api';
import { keys, queryClient } from '@/lib/query';
import { relTime } from '@/lib/format';
import { errorText, t, type Key } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, KIND_EMOJI, R, S, T } from '@/lib/theme';
import { Button, ErrorState, Field, Loading, Note, Screen, Txt } from '@/components/ui';
const TICKET_EMOJI = { open: '⏳', answered: '💬', closed: '✅' } as const;

function Bubble({ mine, who, body, when }: { mine: boolean; who: string; body: string; when: string | null }) {
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 4 }}>
      <Txt style={[T.caption, { textAlign: mine ? 'right' : 'left' }]}>{who}{when ? ` · ${relTime(when)}` : ''}</Txt>
      <View style={{ backgroundColor: mine ? C.accentSoft : C.card, borderWidth: 1, borderColor: mine ? C.accentBorder : C.cardBorder, borderRadius: R.xl, padding: S.md }}>
        <Txt selectable style={T.body}>{body}</Txt>
      </View>
    </View>
  );
}

export default function TicketThread() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const q = useQuery({ queryKey: keys.ticket(id), queryFn: () => support.get(id), refetchInterval: 30000 });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const tk = q.data?.ticket;
  const replies = q.data?.replies ?? [];
  const send = async () => {
    if (reply.trim().length < EXTRA_LIMITS.replyMin || busy) return;
    setBusy(true);
    try {
      await support.reply(id, reply.trim());
      haptic.success();
      setReply('');
      await Promise.all([q.refetch(), queryClient.invalidateQueries({ queryKey: keys.tickets })]);
    } catch (e) {
      haptic.error();
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      back
      keyboard
      title={tk ? `${TICKET_EMOJI[tk.status]} ${tk.subject}` : ''}
      sub={tk ? t(`tstatus.${tk.status}` as Key) : undefined}
      testID="ticket-thread"
      footer={tk && tk.status !== 'closed' ? (
        <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-end' }}>
          <Field style={{ flex: 1 }} value={reply} onChangeText={setReply} placeholder={t('tickets2.replyPh')} multiline maxLength={EXTRA_LIMITS.ticketBody} testID="ticket-reply" />
          <Button label={t('tickets2.reply')} small onPress={send} loading={busy} disabled={reply.trim().length < EXTRA_LIMITS.replyMin} testID="ticket-reply-send" />
        </View>
      ) : undefined}
    >
      {q.isLoading ? <Loading /> : !tk ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          {tk.bot ? <Txt style={T.sub}>{KIND_EMOJI[tk.bot.kind] ?? '🤖'} {tk.bot.name}</Txt> : null}
          <Bubble mine who={t('tickets2.me')} body={tk.body} when={tk.created_at} />
          {replies.map((r, i) => (
            <Bubble key={r.id ?? i} mine={r.author === 'user'} who={r.author === 'user' ? t('tickets2.me') : r.author_name || t('tickets2.team')} body={r.body} when={r.created_at} />
          ))}
          {tk.status === 'closed' ? <Note emoji="✅" tone="good" text={t('tickets2.closed')} /> : tk.status === 'open' && !replies.some((r) => r.author !== 'user') ? <Note emoji="⏳" text={t('tickets2.waiting')} /> : null}
        </>
      )}
    </Screen>
  );
}

// Ein Gespräch mit dem Team: Nachrichten als Blasen (meine rechts/am Ende), Bilder antippen = groß,
// unten antworten – auch mit Bild (wenn nicht geschlossen).
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
import { Button, ErrorState, Field, IconBtn, Loading, Note, Screen, Txt } from '@/components/ui';
import { chooseImage, Picture } from '@/components/ImageBits';
const TICKET_EMOJI = { open: '⏳', answered: '💬', closed: '✅' } as const;

function Bubble({ mine, who, body, when, image }: { mine: boolean; who: string; body: string; when: string | null; image?: string | null }) {
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 4 }}>
      <Txt style={[T.caption, { textAlign: mine ? 'right' : 'left' }]}>{who}{when ? ` · ${relTime(when)}` : ''}</Txt>
      <View style={{ backgroundColor: mine ? C.accentSoft : C.card, borderWidth: 1, borderColor: mine ? C.accentBorder : C.cardBorder, borderRadius: R.xl, padding: S.md, gap: S.sm }}>
        <Txt selectable style={T.body}>{body}</Txt>
        {image ? <Picture uri={image} size={150} wide /> : null}
      </View>
    </View>
  );
}

export default function TicketThread() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const q = useQuery({ queryKey: keys.ticket(id), queryFn: () => support.get(id), refetchInterval: 30000 });
  const [reply, setReply] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tk = q.data?.ticket;
  const replies = q.data?.replies ?? [];
  const send = async () => {
    if (reply.trim().length < EXTRA_LIMITS.replyMin || busy) return;
    setBusy(true);
    try {
      await support.reply(id, reply.trim(), image);
      haptic.success();
      setReply('');
      setImage(null);
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
        <View style={{ gap: S.sm }}>
          {image ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
              <Picture uri={image} size={56} />
              <Txt style={[T.sub, { flex: 1 }]}>{t('img.mine')}</Txt>
              <IconBtn icon="close" label={t('img.remove')} onPress={() => setImage(null)} testID="ticket-reply-image-remove" />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-end' }}>
            <IconBtn icon="image-outline" label={t('img.add')} onPress={async () => { const v = await chooseImage(); if (v) setImage(v); }} testID="ticket-reply-image" />
            <Field style={{ flex: 1 }} value={reply} onChangeText={setReply} placeholder={t('tickets2.replyPh')} multiline maxLength={EXTRA_LIMITS.ticketBody} testID="ticket-reply" />
            <Button label={t('tickets2.reply')} small onPress={send} loading={busy} disabled={reply.trim().length < EXTRA_LIMITS.replyMin} testID="ticket-reply-send" />
          </View>
        </View>
      ) : undefined}
    >
      {q.isLoading ? <Loading /> : !tk ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          {tk.bot ? <Txt style={T.sub}>{KIND_EMOJI[tk.bot.kind] ?? '🤖'} {tk.bot.name}</Txt> : null}
          <Bubble mine who={t('tickets2.me')} body={tk.body} when={tk.created_at} image={tk.image} />
          {replies.map((r, i) => (
            <Bubble key={r.id ?? i} mine={r.author === 'user'} who={r.author === 'user' ? t('tickets2.me') : r.author_name || t('tickets2.team')} body={r.body} when={r.created_at} image={r.image} />
          ))}
          {tk.status === 'closed' ? <Note emoji="✅" tone="good" text={t('tickets2.closed')} /> : tk.status === 'open' && !replies.some((r) => r.author !== 'user') ? <Note emoji="⏳" text={t('tickets2.waiting')} /> : null}
        </>
      )}
    </Screen>
  );
}

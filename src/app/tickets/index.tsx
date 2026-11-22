// Nachrichten ans Team (Support-Tickets): Liste mit Status in einfachen Worten, großer „+ Neue Nachricht“.
import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { support, type TicketStatus } from '@/api';
import { keys, queryClient, usePullRefresh } from '@/lib/query';
import { relTime } from '@/lib/format';
import { t, type Key } from '@/lib/i18n';
import { T } from '@/lib/theme';
import { AddButton, Empty, ErrorState, ListItem, Loading, Screen, Txt } from '@/components/ui';

const TICKET_EMOJI: Record<TicketStatus, string> = { open: '⏳', answered: '💬', closed: '✅' };

export default function Tickets() {
  const router = useRouter();
  const q = useQuery({ queryKey: keys.tickets, queryFn: support.list });
  const { refreshing, onRefresh } = usePullRefresh(() => q.refetch());
  useFocusEffect(useCallback(() => { queryClient.invalidateQueries({ queryKey: keys.tickets }); }, []));
  return (
    <Screen back title={`💌 ${t('account.tickets')}`} onRefresh={onRefresh} refreshing={refreshing} testID="tickets">
      <Txt style={T.callout}>{t('tickets2.sub')}</Txt>
      <AddButton label={t('tickets2.new')} onPress={() => router.push('/tickets/new')} testID="ticket-new" />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !(q.data ?? []).length ? (
        <Empty emoji="📭" title={t('tickets2.empty')} />
      ) : (
        (q.data ?? []).map((tk) => (
          <ListItem
            key={tk.id}
            testID={`ticket-${tk.id}`}
            emoji={TICKET_EMOJI[tk.status]}
            title={tk.subject}
            sub={`${t(`tstatus.${tk.status}` as Key)} · ${relTime(tk.updated_at ?? tk.created_at)}`}
            onPress={() => router.push({ pathname: '/tickets/[id]', params: { id: String(tk.id) } })}
          />
        ))
      )}
    </Screen>
  );
}

// Hilfe-Roboter: dieselbe KI wie der Chat auf der Webseite (POST /chat, gemeinsames Tageslimit).
import { useRef, useState } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';
import { useRouter } from 'expo-router';
import { helpChat, type ChatMessage, EXTRA_LIMITS } from '@/api';
import { errorText, getLang, t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { C, R, S, T } from '@/lib/theme';
import { Button, Field, Note, Screen, Templates, Txt } from '@/components/ui';

function Bubble({ m }: { m: ChatMessage }) {
  const mine = m.role === 'user';
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
      {!mine ? <Txt style={{ fontSize: 24 }} maxFontSizeMultiplier={1.2}>🤖</Txt> : null}
      <View style={{ backgroundColor: mine ? C.accentSoft : C.card, borderWidth: 1, borderColor: mine ? C.accentBorder : C.cardBorder, borderRadius: R.xl, padding: S.md, flexShrink: 1 }}>
        <Txt selectable style={T.body}>{m.content}</Txt>
      </View>
    </View>
  );
}

export default function HelpChat() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(false);
  const scroller = useRef<ScrollViewInstance>(null);
  const send = async (v = text) => {
    const content = v.trim().slice(0, EXTRA_LIMITS.chatMessage);
    if (!content || busy) return;
    const next: ChatMessage[] = [...msgs, { role: 'user', content }];
    setMsgs(next);
    setText('');
    setBusy(true);
    try {
      const r = await helpChat.send(next.slice(-10), getLang());
      setMsgs((l) => [...l, { role: 'assistant', content: r.reply }]);
      if (r.limit_reached) setLimit(true);
    } catch (e) {
      haptic.error();
      setMsgs((l) => [...l, { role: 'assistant', content: `😕 ${errorText(e)}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 100);
    }
  };
  return (
    <Screen
      back
      keyboard
      scroll={false}
      title={`🤖 ${t('chat.title')}`}
      testID="chat"
      footer={limit ? (
        <Button label={t('help.writeUs')} emoji="💌" onPress={() => router.replace('/tickets/new')} />
      ) : (
        <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-end' }}>
          <Field style={{ flex: 1 }} value={text} onChangeText={setText} placeholder={t('chat.ph')} multiline maxLength={EXTRA_LIMITS.chatMessage} testID="chat-input" />
          <Button label={t('chat.send')} small onPress={() => send()} loading={busy} disabled={!text.trim()} testID="chat-send" />
        </View>
      )}
    >
      <ScrollView ref={scroller} contentContainerStyle={{ gap: S.md, paddingVertical: S.md }} keyboardShouldPersistTaps="handled">
        <Bubble m={{ role: 'assistant', content: t('chat.hello') }} />
        {msgs.map((m, i) => <Bubble key={i} m={m} />)}
        {busy ? <Txt style={[T.sub, { paddingHorizontal: S.sm }]}>🤖 …</Txt> : null}
        {!msgs.length ? <Templates title={t('chat.ideas')} items={[t('chat.q1'), t('chat.q2'), t('chat.q3')]} onPick={(q) => send(q)} /> : null}
        {limit ? <Note emoji="⏰" tone="warn" text={t('chat.limit')} /> : null}
      </ScrollView>
    </Screen>
  );
}

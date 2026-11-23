// Hilfe: Suche, Fragen & Antworten, „Zeig mir, wie“, Chat-Wörter je Bot-Art, Nachricht ans Team, Discord.
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BOT_KINDS } from '@/api';
import { chatWords, content, SUPPORT_DISCORD, type CmdKind, type GuideKey } from '@/lib/content';
import { t } from '@/lib/i18n';
import { openUrl } from '@/lib/ui';
import { C, KIND_EMOJI, S, T } from '@/lib/theme';
import { Button, Field, Screen, SectionTitle, Tabs, Txt } from '@/components/ui';
import { Expandable, GuideSteps } from '@/components/guide';
import { CommandList } from '@/components/CommandList';

// „Zeig mir, wie“ – alle Anleitungen der Webseite (How-To), ohne die Abschnitte zum Kaufen/Aufladen/Mieten
const GUIDES: { key: GuideKey; emoji: string }[] = [
  { key: 'register', emoji: '✨' }, { key: 'newBot', emoji: '➕' }, { key: 'token', emoji: '🔑' }, { key: 'designer', emoji: '🚪' },
  { key: 'roomLink', emoji: '🔗' }, { key: 'startStop', emoji: '⏯️' }, { key: 'messages', emoji: '👋' }, { key: 'link', emoji: '🤝' },
  { key: 'vipzone', emoji: '💎' }, { key: 'djSongs', emoji: '💿' }, { key: 'radio', emoji: '📻' }, { key: 'password', emoji: '🔒' },
];
const CMD_KINDS: CmdKind[] = [...BOT_KINDS, 'bank'];

export default function Help() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<CmdKind>('welcome');
  const query = q.trim().toLowerCase();
  const match = (...parts: string[]) => !query || parts.join(' ').toLowerCase().includes(query);
  const faq = useMemo(() => content.faq.filter((f) => match(f.q, f.a)), [query]);
  const guides = useMemo(() => GUIDES.filter((g) => match(content.guides[g.key].title, ...content.guides[g.key].steps)), [query]);
  // Suche findet auch Chat-Wörter (z. B. „!warn“ oder „Tickets“)
  const words = useMemo(() => (query ? CMD_KINDS.filter((k) => chatWords()[k].some((c) => match(c.cmd, c.what))) : []), [query]);
  const nothing = !faq.length && !guides.length && !words.length;

  return (
    <Screen tab title={t('help.title')} testID="help">
      <Field
        testID="help-search"
        value={q}
        onChangeText={setQ}
        placeholder={t('help.search')}
        returnKeyType="search"
        clearButtonMode="while-editing"
        right={<Ionicons name="search" size={22} color={C.text3} style={{ marginHorizontal: 14 }} />}
      />
      {nothing ? <Txt style={[T.callout, { textAlign: 'center' }]}>🔎 {t('help.noResults')}</Txt> : null}

      {faq.length ? (
        <View style={{ gap: S.sm }}>
          <SectionTitle title={t('help.faq')} />
          {faq.map((f) => (
            <Expandable key={f.q} title={f.q} emoji="💬" open={!!query}>
              <View style={{ gap: S.md }}>
                <Txt style={[T.body, { color: C.text2 }]}>{f.a}</Txt>
                {f.guide ? <GuideSteps guide={f.guide} /> : null}
              </View>
            </Expandable>
          ))}
        </View>
      ) : null}

      {guides.length ? (
        <View style={{ gap: S.sm }}>
          <SectionTitle title={t('help.guides')} />
          {guides.map((g) => (
            <Expandable key={g.key} title={content.guides[g.key].title} emoji={g.emoji} open={!!query}>
              <GuideSteps guide={g.key} />
            </Expandable>
          ))}
        </View>
      ) : null}

      {!query ? (
        <View style={{ gap: S.sm }}>
          <SectionTitle title={t('help.chatWords')} />
          <Txt style={T.callout}>{kind === 'bank' ? t('help.bankSub') : t('help.chatWordsSub')}</Txt>
          <Tabs<CmdKind>
            value={kind}
            onChange={setKind}
            options={CMD_KINDS.map((k) => ({ value: k, label: k === 'bank' ? t('help.bank') : t(`kind.${k}`), emoji: k === 'bank' ? '🤝' : KIND_EMOJI[k] }))}
          />
          <CommandList kind={kind} />
        </View>
      ) : words.length ? (
        <View style={{ gap: S.sm }}>
          <SectionTitle title={t('help.chatWords')} />
          {words.map((k) => <CommandList key={k} kind={k} filter={query} />)}
        </View>
      ) : null}

      <SectionTitle title={t('help.stuck')} />
      <Button testID="help-chat" label={t('help.askBot')} emoji="🤖" onPress={() => router.push('/chat')} />
      <Button testID="help-write" label={t('help.writeUs')} emoji="💌" variant="secondary" onPress={() => router.push('/tickets')} />
      <Button testID="help-discord" label={t('help.discord')} emoji="💬" variant="secondary" onPress={() => openUrl(SUPPORT_DISCORD)} />
    </Screen>
  );
}

// Reiter „Hilfe“: Suche, Fragen & Antworten, Schritt-für-Schritt-Anleitungen, Chat-Befehle je Bot-Art, Discord-Support.
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOT_KINDS, type BotKind } from '@/api';
import { content, SUPPORT_DISCORD, type GuideKey } from '@/lib/content';
import { t } from '@/lib/i18n';
import { openUrl } from '@/lib/ui';
import { C, S, T } from '@/lib/theme';
import { Backdrop, Button, Field, KindIcon, ScreenTitle, Segmented } from '@/components/ui';
import { Expandable, GuideSteps } from '@/components/guide';
import { CommandList } from '@/components/CommandList';
import Ionicons from '@expo/vector-icons/Ionicons';

const GUIDES: GuideKey[] = ['token', 'designer', 'roomLink', 'messages'];

export default function Help() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<BotKind>('welcome');
  const query = q.trim().toLowerCase();
  const match = (...parts: string[]) => !query || parts.join(' ').toLowerCase().includes(query);

  const faq = useMemo(() => content.faq.filter((f) => match(f.q, f.a)), [query]);
  const guides = useMemo(() => GUIDES.filter((g) => match(content.guides[g].title, ...content.guides[g].steps)), [query]);
  const cmdKinds = useMemo(
    () => BOT_KINDS.filter((k) => content.commands[k].some((c) => match(c.cmd, c.what, t(`kind.${k}`)))),
    [query],
  );
  const nothing = !faq.length && !guides.length && !cmdKinds.length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + 110, gap: S.xl }}
      >
        <ScreenTitle title={t('help.title')} />
        <Field
          testID="help-search"
          value={q}
          onChangeText={setQ}
          placeholder={t('help.search')}
          returnKeyType="search"
          clearButtonMode="while-editing"
          right={<Ionicons name="search" size={18} color={C.text3} style={{ marginRight: 14 }} />}
        />

        {nothing ? <Text style={[T.callout, { textAlign: 'center' }]}>{t('help.noResults')}</Text> : null}

        {faq.length ? (
          <View style={{ gap: S.sm }}>
            <Text style={[T.section, { paddingHorizontal: 4 }]}>{t('help.faq')}</Text>
            {faq.map((f) => (
              <Expandable key={f.q} title={f.q} icon="chatbubble-ellipses-outline" open={!!query}>
                <View style={{ gap: S.md }}>
                  <Text style={[T.body, { color: C.text2, lineHeight: 23 }]}>{f.a}</Text>
                  {f.guide ? <GuideSteps guide={f.guide} /> : null}
                </View>
              </Expandable>
            ))}
          </View>
        ) : null}

        {guides.length ? (
          <View style={{ gap: S.sm }}>
            <Text style={[T.section, { paddingHorizontal: 4 }]}>{t('help.guides')}</Text>
            {guides.map((g) => (
              <Expandable key={g} title={content.guides[g].title} icon="list-outline" open={!!query}>
                <GuideSteps guide={g} />
              </Expandable>
            ))}
          </View>
        ) : null}

        {cmdKinds.length ? (
          <View style={{ gap: S.sm }}>
            <Text style={[T.section, { paddingHorizontal: 4 }]}>{t('help.commands')}</Text>
            <Text style={[T.sub, { paddingHorizontal: 4 }]}>{t('help.commandsSub')}</Text>
            {query ? (
              cmdKinds.map((k) => (
                <View key={k} style={{ gap: S.sm, marginTop: S.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                    <KindIcon kind={k} size={28} />
                    <Text style={T.headline}>{t(`kind.${k}`)}</Text>
                  </View>
                  <CommandList kind={k} filter={query} />
                </View>
              ))
            ) : (
              <>
                <Segmented<BotKind> value={kind} onChange={setKind} options={BOT_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))} />
                <CommandList kind={kind} />
              </>
            )}
          </View>
        ) : null}

        <Button testID="help-support" label={t('help.support')} icon="logo-discord" variant="secondary" onPress={() => openUrl(SUPPORT_DISCORD)} />
      </ScrollView>
    </View>
  );
}

// „Lass es uns beheben“: die häufigsten Gründe in einfachen Worten, je mit einem passenden Knopf.
import { useRef } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { closeFixIt, useFixIt } from '@/lib/fixit';
import { content, SUPPORT_DISCORD } from '@/lib/content';
import { powerBot } from '@/lib/query';
import { t } from '@/lib/i18n';
import { openUrl } from '@/lib/ui';
import { C, R, S, T } from '@/lib/theme';
import { Button, dirStyle, Txt } from './ui';
import { Expandable, GuideSteps } from './guide';

export function FixItSheet() {
  const current = useFixIt();
  const insets = useSafeAreaInsets();
  // beim Zuschieben den letzten Inhalt weiter zeigen (sonst springt der Text während der Animation)
  const last = useRef(current);
  if (current) last.current = current;
  const fix = current ?? last.current;
  const bot = fix?.bot;
  const goTo = (page: string) => {
    if (!bot) return;
    closeFixIt();
    router.navigate({ pathname: '/bot/[kind]/[id]/[page]', params: { kind: bot.kind, id: String(bot.id), page } });
  };
  return (
    <Modal visible={!!current} transparent animationType="slide" onRequestClose={closeFixIt}>
      <View style={[{ flex: 1 }, dirStyle()]}>
        <Pressable style={{ flex: 1, backgroundColor: C.overlay }} onPress={closeFixIt} accessibilityLabel={t('common.close')} />
        <View style={{ backgroundColor: C.bg2, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, maxHeight: '90%', borderWidth: 1, borderColor: C.cardBorder }}>
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.borderStrong }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: Math.max(insets.bottom, S.lg) + S.lg, gap: S.lg }}>
            <View style={{ alignItems: 'center', gap: S.sm }}>
              <Txt style={{ fontSize: 52 }} maxFontSizeMultiplier={1.2}>🛠️</Txt>
              <Txt style={[T.title, { textAlign: 'center' }]}>{t('fix.title')}</Txt>
              {bot ? <Txt style={[T.sub, { textAlign: 'center' }]}>{bot.name}</Txt> : null}
            </View>
            <Txt style={[T.body, { color: C.text2, textAlign: 'center' }]}>{fix?.reason === 'agent' ? t('fix.agentSub') : t('fix.sub')}</Txt>

            {fix?.reason === 'crashed' ? (
              <View style={{ gap: S.sm }}>
                <Cause n={1} text={content.fix.designer}>
                  <Expandable title={t('common.showMe')} emoji="👀" testID="fix-designer">
                    <GuideSteps guide="designer" />
                  </Expandable>
                </Cause>
                <Cause n={2} text={content.fix.token}>
                  <Button label={t('fix.replaceKey')} variant="secondary" small emoji="🔑" onPress={() => goTo('expert')} />
                </Cause>
                <Cause n={3} text={content.fix.room}>
                  <Button label={t('fix.checkRoom')} variant="secondary" small emoji="🏠" onPress={() => goTo('expert')} />
                </Cause>
              </View>
            ) : null}

            <Button
              testID="fix-retry"
              label={t('fix.tryAgain')}
              emoji="🔄"
              onPress={() => {
                if (!bot) return;
                closeFixIt();
                powerBot(bot, bot.status === 'running' ? 'restart' : 'start');
              }}
            />
            <Button label={t('fix.support')} variant="ghost" small emoji="💬" onPress={() => openUrl(SUPPORT_DISCORD)} />
            <Button label={t('common.close')} variant="secondary" small onPress={closeFixIt} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Cause({ n, text, children }: { n: number; text: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: R.md, padding: S.md, gap: S.md, borderWidth: 1, borderColor: C.cardBorder }}>
      <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={[T.sub, { color: C.onAccent, fontWeight: '800', textAlign: 'center' }]} maxFontSizeMultiplier={1.2}>{n}</Txt>
        </View>
        <Txt style={[T.headline, { flex: 1 }]}>{text}</Txt>
      </View>
      {children}
    </View>
  );
}

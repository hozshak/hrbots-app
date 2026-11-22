// „Lass es uns beheben“: häufigste Ursachen in einfachen Worten, jeweils mit passendem Knopf.
import { useRef } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { closeFixIt, useFixIt } from '@/lib/fixit';
import { content, SUPPORT_DISCORD } from '@/lib/content';
import { powerBot } from '@/lib/query';
import { t } from '@/lib/i18n';
import { openUrl } from '@/lib/ui';
import { C, R, S, T } from '@/lib/theme';
import { Button } from './ui';
import { Expandable, GuideSteps } from './guide';

export function FixItSheet() {
  const current = useFixIt();
  const insets = useSafeAreaInsets();
  // beim Zuschieben den letzten Inhalt weiter zeigen (sonst springt der Text während der Animation)
  const last = useRef(current);
  if (current) last.current = current;
  const fix = current ?? last.current;
  const bot = fix?.bot;
  const goTo = (open: string) => {
    if (!bot) return;
    closeFixIt();
    router.navigate({ pathname: '/bot/[kind]/[id]', params: { kind: bot.kind, id: String(bot.id), open } });
  };
  return (
    <Modal visible={!!current} transparent animationType="slide" onRequestClose={closeFixIt}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={closeFixIt} accessibilityLabel={t('common.close')} />
      <View style={{ backgroundColor: C.cardSolid, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, maxHeight: '88%', borderWidth: 0.5, borderColor: C.cardBorder }}>
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xl, gap: S.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(251,191,36,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="construct" size={24} color={C.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={T.title}>{t('fix.title')}</Text>
              {bot ? <Text style={T.sub}>{bot.name}</Text> : null}
            </View>
          </View>
          <Text style={[T.body, { color: C.text2, lineHeight: 23 }]}>{fix?.reason === 'agent' ? t('fix.agentSub') : t('fix.sub')}</Text>

          {fix?.reason === 'crashed' ? (
            <View style={{ gap: S.sm }}>
              <Cause n={1} text={content.fix.designer}>
                <Expandable title={t('fix.howDesigner')} icon="list-outline" testID="fix-designer">
                  <GuideSteps guide="designer" />
                </Expandable>
              </Cause>
              <Cause n={2} text={content.fix.token}>
                <Button label={t('fix.replaceToken')} variant="secondary" small icon="key-outline" onPress={() => goTo('key')} style={{ alignSelf: 'flex-start' }} />
              </Cause>
              <Cause n={3} text={content.fix.room}>
                <Button label={t('fix.checkRoom')} variant="secondary" small icon="home-outline" onPress={() => goTo('room')} style={{ alignSelf: 'flex-start' }} />
              </Cause>
            </View>
          ) : null}

          <Button
            testID="fix-retry"
            label={t('fix.tryAgain')}
            icon="refresh"
            onPress={() => {
              if (!bot) return;
              closeFixIt();
              powerBot(bot, bot.status === 'running' ? 'restart' : 'start');
            }}
          />
          {fix?.reason === 'crashed' ? (
            <Button label={t('fix.logs')} variant="ghost" small icon="document-text-outline" onPress={() => goTo('logs')} />
          ) : null}
          <Button label={t('fix.support')} variant="ghost" small icon="logo-discord" onPress={() => openUrl(SUPPORT_DISCORD)} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Cause({ n, text, children }: { n: number; text: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: R.md, padding: S.md, gap: S.sm }}>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Text style={[T.headline, { color: C.yellow }]}>{n}.</Text>
        <Text style={[T.headline, { flex: 1 }]}>{text}</Text>
      </View>
      {children}
    </View>
  );
}

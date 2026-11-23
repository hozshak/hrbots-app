// Aufklappbare Hilfe: „Warum?“ und „Zeig mir, wie“ mit nummerierten Emoji-Schritten.
import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { content, type GuideKey } from '@/lib/content';
import { t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { C, R, S, T } from '@/lib/theme';
import { Txt } from './ui';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
export const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
};

export function GuideSteps({ guide, steps }: { guide?: GuideKey; steps?: string[] }) {
  const list = steps ?? (guide ? content.guides[guide].steps : []);
  return (
    <View style={{ gap: S.md }}>
      {list.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={[T.sub, { color: C.onAccent, fontWeight: '800', textAlign: 'center' }]} maxFontSizeMultiplier={1.2}>{i + 1}</Txt>
          </View>
          <Txt style={[T.body, { flex: 1, lineHeight: 24 }]}>{s}</Txt>
        </View>
      ))}
    </View>
  );
}

export function Expandable({ title, emoji, children, open: initial = false, testID }: {
  title: string; emoji: string; children: ReactNode; open?: boolean; testID?: string;
}) {
  const [open, setOpen] = useState(initial);
  return (
    <View style={{ borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' }}>
      <Pressable
        testID={testID}
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptic.select();
          animateLayout();
          setOpen((v) => !v);
        }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 60, paddingHorizontal: S.lg, opacity: pressed ? 0.6 : 1 })}
      >
        <Txt style={{ fontSize: 22 }}>{emoji}</Txt>
        <Txt style={[T.body, { flex: 1, fontWeight: '700' }]}>{title}</Txt>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={C.text2} />
      </Pressable>
      {open ? <View style={{ paddingHorizontal: S.lg, paddingBottom: S.lg }}>{children}</View> : null}
    </View>
  );
}

/** „Zeig mir, wie“ (Schritte) und optional „Warum?“ */
export function HelpBits({ why, guide, openGuide }: { why?: string; guide?: GuideKey; openGuide?: boolean }) {
  return (
    <View style={{ gap: S.sm }}>
      {guide ? (
        <Expandable title={t('common.showMe')} emoji="👀" open={openGuide} testID={`howto-${guide}`}>
          <GuideSteps guide={guide} />
        </Expandable>
      ) : null}
      {why ? (
        <Expandable title={t('common.why')} emoji="🤔">
          <Txt style={[T.body, { color: C.text2, lineHeight: 24 }]}>{why}</Txt>
        </Expandable>
      ) : null}
    </View>
  );
}

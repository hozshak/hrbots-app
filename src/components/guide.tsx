// Aufklappbare Hilfe: „Wozu brauche ich das?“ und „Zeig mir, wie“ mit nummerierten Schritten.
import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { content, type GuideKey } from '@/lib/content';
import { t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { C, R, S, T } from '@/lib/theme';
import type { IconName } from './ui';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
export const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
};

export function GuideSteps({ guide }: { guide: GuideKey }) {
  const g = content.guides[guide];
  return (
    <View style={{ gap: S.sm }}>
      {g.steps.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <Text style={[T.sub, { color: C.accent, fontWeight: '700' }]}>{i + 1}</Text>
          </View>
          <Text style={[T.body, { flex: 1, lineHeight: 23 }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

export function Expandable({ title, icon, children, open: initial = false, testID }: {
  title: string; icon: IconName; children: ReactNode; open?: boolean; testID?: string;
}) {
  const [open, setOpen] = useState(initial);
  return (
    <View style={{ borderRadius: R.md, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
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
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 50, paddingHorizontal: S.md, opacity: pressed ? 0.6 : 1 })}
      >
        <Ionicons name={icon} size={20} color={C.accent} />
        <Text style={[T.body, { flex: 1, color: C.text, fontWeight: '500' }]}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.text3} />
      </Pressable>
      {open ? <View style={{ paddingHorizontal: S.md, paddingBottom: S.md }}>{children}</View> : null}
    </View>
  );
}

export function HelpBits({ why, guide }: { why?: string; guide?: GuideKey }) {
  return (
    <View style={{ gap: S.sm }}>
      {why ? (
        <Expandable title={t('wiz.why')} icon="help-circle-outline">
          <Text style={[T.body, { color: C.text2, lineHeight: 23 }]}>{why}</Text>
        </Expandable>
      ) : null}
      {guide ? (
        <Expandable title={t('wiz.how')} icon="list-outline">
          <GuideSteps guide={guide} />
        </Expandable>
      ) : null}
    </View>
  );
}

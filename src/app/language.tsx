// Sprache: Automatisch (wie iPhone) / Deutsch / English / العربية. Wirkt sofort (auch Rechts-nach-links), wird gespeichert.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { deviceLang, getLangSetting, LANG_NAMES, LANG_SETTINGS, setLangSetting, t, type LangSetting } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { C, glow, R, S, T } from '@/lib/theme';
import { Screen, Txt } from '@/components/ui';

const FLAG: Record<LangSetting, string> = { auto: '📱', de: '🇩🇪', en: '🇬🇧', ar: '🇸🇦' };

export default function Language() {
  const [sel, setSel] = useState<LangSetting>(getLangSetting());
  const pick = async (s: LangSetting) => {
    haptic.select();
    setSel(s);
    await setLangSetting(s);
  };
  return (
    <Screen back title={`🌍 ${t('account.language')}`} testID="language">
      <Txt style={T.callout}>{t('lang.sub')}</Txt>
      <View style={{ gap: S.sm }} accessibilityRole="radiogroup">
        {LANG_SETTINGS.map((s) => {
          const on = s === sel;
          const label = s === 'auto' ? t('lang.auto') : LANG_NAMES[s];
          const sub = s === 'auto' ? t('lang.autoSub', { lang: LANG_NAMES[deviceLang()] }) : null;
          return (
            <Pressable
              key={s}
              testID={`lang-${s}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={label}
              onPress={() => pick(s)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 72, paddingHorizontal: S.lg, borderRadius: R.lg,
                  backgroundColor: on ? C.accentSoft : pressed ? C.cardPressed : C.card, borderWidth: on ? 2 : 1, borderColor: on ? C.accent : C.cardBorder,
                },
                on ? glow(C.accent, 0.3) : null,
              ]}
            >
              <Txt style={{ fontSize: 32 }} maxFontSizeMultiplier={1.2}>{FLAG[s]}</Txt>
              <View style={{ flex: 1 }}>
                <Txt style={[T.big, { writingDirection: s === 'ar' ? 'rtl' : undefined }]}>{label}</Txt>
                {sub ? <Txt style={T.sub}>{sub}</Txt> : null}
              </View>
              {on ? <Ionicons name="checkmark-circle" size={32} color={C.accent} /> : <View style={{ width: 32 }} />}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

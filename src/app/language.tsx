// Sprache: Automatisch (wie iPhone) / Deutsch / English / العربية. Wirkt sofort (auch Rechts-nach-links), wird gespeichert.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { deviceLang, getLangSetting, LANG_NAMES, LANG_SETTINGS, setLangSetting, t, type LangSetting } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { C, glow, R, S, T } from '@/lib/theme';
import { Screen, Txt } from '@/components/ui';

// Keine Länderflaggen für Sprachen (Arabisch ist nicht ein Land; Flaggen-Emojis fehlen auf manchen Geräten) → Schrift-Zeichen
const BADGE: Record<LangSetting, string> = { auto: '📱', de: 'DE', en: 'EN', ar: 'ع' };

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
              <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.accent : C.card2, borderWidth: 1, borderColor: on ? C.accent : C.cardBorder }}>
                <Txt style={{ fontSize: s === 'auto' ? 22 : s === 'ar' ? 22 : 15, fontWeight: '800', color: on ? C.onAccent : C.text, textAlign: 'center' }} maxFontSizeMultiplier={1.2}>{BADGE[s]}</Txt>
              </View>
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

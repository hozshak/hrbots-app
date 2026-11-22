// Bausteine der Oberfläche – groß, freundlich, hoher Kontrast. Alles spiegelt sich bei Arabisch (direction: 'rtl').
// Seiten nutzen <Screen>: Kopfzeile sitzt immer UNTER der Statusleiste/Dynamic Island (SafeAreaView), nie darunter.
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text,
  TextInput, View, type StyleProp, type TextInputInstance, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MOCK } from '@/api';
import { errorText, isRTL, t } from '@/lib/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { C, glow, mono, PRIMARY_GRADIENT, R, S, T } from '@/lib/theme';
import { haptic } from '@/lib/ui';

export type IconName = keyof typeof Ionicons.glyphMap;

/** Schrift-Größe folgt Dynamic Type, aber höchstens 1,6-fach (sonst bricht das Layout auf kleinen iPhones) */
export function Txt({ style, maxFontSizeMultiplier = 1.6, ...p }: TextProps & { style?: StyleProp<TextStyle> }) {
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={style} {...p} />;
}

export const dirStyle = (): ViewStyle => ({ direction: isRTL() ? 'rtl' : 'ltr' });
/** Pfeile zeigen bei Arabisch in die andere Richtung */
export const fwdIcon = (): IconName => (isRTL() ? 'chevron-back' : 'chevron-forward');
export const backIcon = (): IconName => (isRTL() ? 'chevron-forward' : 'chevron-back');
export const arrowFwd = (): IconName => (isRTL() ? 'arrow-back' : 'arrow-forward');

export function goBack(fallback = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}

// ---------------------------------------------------------------- Seite
export function Screen({
  title, sub, back, close, right, children, scroll = true, onRefresh, refreshing, footer, tab, testID, keyboard, scrollKey,
}: {
  title?: string; sub?: string; back?: boolean | (() => void); close?: () => void; right?: ReactNode; children: ReactNode;
  scroll?: boolean; onRefresh?: () => void; refreshing?: boolean; footer?: ReactNode; tab?: boolean; testID?: string; keyboard?: boolean;
  /** neuer Wert = Liste beginnt wieder oben (z. B. nächster Schritt im Assistenten) */
  scrollKey?: string;
}) {
  const insets = useSafeAreaInsets();
  const onBack = typeof back === 'function' ? back : back ? () => goBack() : undefined;
  const bottomPad = tab ? S.xl : Math.max(insets.bottom, S.lg) + S.lg;
  const body = scroll ? (
    <ScrollView
      key={scrollKey}
      testID={testID}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: footer ? S.lg : bottomPad, gap: S.lg, flexGrow: 1 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.text2} /> : undefined}
    >
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', gap: S.lg }}>{children}</View>
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: S.lg }}>{children}</View>
  );
  const content = (
    <>
      {body}
      {footer ? <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: tab ? S.md : Math.max(insets.bottom, S.md) + S.sm, gap: S.sm, backgroundColor: C.bg }}>{footer}</View> : null}
    </>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[{ flex: 1, backgroundColor: C.bg }, dirStyle()]}>
      {/* sanftes Neon-Leuchten oben wie auf der Webseite */}
      <LinearGradient pointerEvents="none" colors={['rgba(45,212,255,0.10)', 'rgba(45,212,255,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }} />
      {title !== undefined || onBack || close || right ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: S.sm, minHeight: 60 }}>
          {onBack ? <IconBtn testID="back" icon={backIcon()} label={t('common.back')} onPress={onBack} /> : null}
          <View style={{ flex: 1, paddingHorizontal: onBack ? 0 : S.xs }}>
            {title ? <Txt style={[T.title, onBack ? { fontSize: 22 } : { fontSize: 28 }]} numberOfLines={2} accessibilityRole="header">{title}</Txt> : null}
            {sub ? <Txt style={T.sub} numberOfLines={2}>{sub}</Txt> : null}
          </View>
          {right}
          {close ? <IconBtn testID="close" icon="close" label={t('common.close')} onPress={close} /> : null}
        </View>
      ) : null}
      {MOCK && tab ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.lg, paddingBottom: S.xs }}>
          <Txt style={[T.caption, { color: C.yellow }]}>🧪 {t('common.demo')}</Txt>
        </View>
      ) : null}
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{content}</KeyboardAvoidingView>
      ) : content}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- Knöpfe
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';
// wie die Webseite: primary = Verlauf Cyan→Lime mit Leuchten; sonst getönter Grund + farbiger Rand
const BTN_BG: Record<BtnVariant, string> = {
  primary: C.accent, secondary: 'rgba(45,212,255,0.05)', danger: C.redSoft, ghost: 'transparent', success: C.greenSoft, warning: C.orangeSoft,
};
const BTN_BORDER: Record<BtnVariant, string> = {
  primary: 'transparent', secondary: C.cardBorder, danger: 'rgba(255,77,109,0.45)', ghost: 'transparent', success: 'rgba(61,240,160,0.5)', warning: 'rgba(255,154,61,0.6)',
};
const BTN_FG: Record<BtnVariant, string> = { primary: C.onAccent, secondary: C.text, danger: C.red, ghost: C.accent, success: C.green, warning: C.orange };

export function Button({
  label, onPress, variant = 'primary', icon, emoji, loading, disabled, small, style, testID,
}: {
  label: string; onPress?: () => void; variant?: BtnVariant; icon?: IconName; emoji?: string; loading?: boolean; disabled?: boolean;
  small?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const fg = BTN_FG[variant];
  const off = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          minHeight: small ? 48 : 60, borderRadius: small ? R.sm : R.md, paddingHorizontal: small ? 16 : 20, paddingVertical: 8,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: variant === 'primary' ? 'visible' : 'hidden',
          backgroundColor: BTN_BG[variant], borderWidth: 1, borderColor: BTN_BORDER[variant], opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          transform: [{ translateY: pressed ? 1 : 0 }],
        },
        variant === 'primary' && !disabled ? glow(C.accent, 0.4) : null,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={PRIMARY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.2 }} style={[StyleSheet.absoluteFill, { borderRadius: small ? R.sm : R.md }]} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {emoji ? <Txt style={{ fontSize: small ? 18 : 22 }}>{emoji}</Txt> : icon ? <Ionicons name={icon} size={small ? 20 : 24} color={fg} /> : null}
          <Txt numberOfLines={2} style={[T.headline, { color: fg, fontSize: small ? 16 : 18, textAlign: 'center', flexShrink: 1 }]}>{label}</Txt>
        </>
      )}
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, label, color = C.text, bg = C.card2, size = 48, disabled, testID }: {
  icon: IconName; onPress: () => void; label: string; color?: string; bg?: string; size?: number; disabled?: boolean; testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </Pressable>
  );
}

/** großer gestrichelter „+ Hinzufügen“-Knopf */
export function AddButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 64, borderRadius: R.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(45,212,255,0.55)',
        backgroundColor: pressed ? C.accentSoft : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: S.lg,
      })}
    >
      <View style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }, glow(C.accent, 0.5)]}>
        <Ionicons name="add" size={26} color={C.onAccent} />
      </View>
      <Txt style={[T.headline, { color: C.text, flexShrink: 1 }]} numberOfLines={2}>{label}</Txt>
    </Pressable>
  );
}

/** Löschen-Knopf (Mülleimer) – fragt vorher nach (confirm im Aufrufer) */
export function TrashButton({ onPress, label }: { onPress: () => void; label: string }) {
  return <IconBtn icon="trash" label={label} color={C.red} bg={C.redSoft} size={46} onPress={onPress} />;
}

// ---------------------------------------------------------------- Karten / Listen
export function Card({ children, style, padded = true, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; tone?: 'warn' | 'bad' | 'good' }) {
  const border = tone === 'warn' ? 'rgba(255,159,67,0.6)' : tone === 'bad' ? 'rgba(255,107,120,0.6)' : tone === 'good' ? 'rgba(47,210,127,0.5)' : C.cardBorder;
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: border, overflow: 'hidden' }, padded && { padding: S.lg }, style]}>
      {children}
    </View>
  );
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: 4, marginTop: S.sm }}>
      <Txt style={[T.section, { flex: 1 }]} accessibilityRole="header">{title}</Txt>
      {right}
    </View>
  );
}

/** eine Zeile in einer Liste: groß, Text links, Knöpfe rechts (gespiegelt bei Arabisch) */
export function ListItem({ emoji, title, sub, right, onPress, onDelete, deleteLabel, muted, testID }: {
  emoji?: string; title: string; sub?: string | null; right?: ReactNode; onPress?: () => void; onDelete?: () => void; deleteLabel?: string;
  muted?: boolean; testID?: string;
}) {
  const inner = (
    <>
      {emoji ? <Txt style={{ fontSize: 26 }}>{emoji}</Txt> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={[T.body, { fontWeight: '600' }, muted && { color: C.text3 }]} numberOfLines={3}>{title}</Txt>
        {sub ? <Txt style={T.sub} numberOfLines={2}>{sub}</Txt> : null}
      </View>
    </>
  );
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.cardBorder, paddingVertical: S.sm, paddingHorizontal: S.md, minHeight: 64 }}>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 48, opacity: pressed ? 0.6 : 1 })}>
          {inner}
        </Pressable>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md }}>{inner}</View>
      )}
      {right}
      {onDelete ? <TrashButton onPress={onDelete} label={deleteLabel ?? `${t('common.delete')}: ${title}`} /> : null}
    </View>
  );
}

/** Menü-Zeile mit Emoji und Pfeil (Konto, Experten-Einstellungen) */
export function MenuRow({ emoji, label, value, onPress, danger, testID }: { emoji: string; label: string; value?: string | null; onPress?: () => void; danger?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      disabled={!onPress}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 64, paddingHorizontal: S.lg, paddingVertical: S.sm,
        backgroundColor: pressed ? C.cardPressed : C.card, borderRadius: R.md, borderWidth: 1, borderColor: danger ? 'rgba(255,107,120,0.4)' : C.cardBorder,
      })}
    >
      <Txt style={{ fontSize: 24 }}>{emoji}</Txt>
      <Txt style={[T.body, { flex: 1, fontWeight: '600', color: danger ? C.red : C.text }]} numberOfLines={2}>{label}</Txt>
      {value ? <Txt style={[T.sub, { maxWidth: '45%', textAlign: isRTL() ? 'left' : 'right' }]} numberOfLines={2}>{value}</Txt> : null}
      {onPress ? <Ionicons name={fwdIcon()} size={22} color={C.text3} /> : null}
    </Pressable>
  );
}

/** große Kachel im Bot-Menü */
export function Tile({ emoji, label, sub, onPress, color = C.accent, testID, wide }: {
  emoji: string; label: string; sub?: string | null; onPress: () => void; color?: string; testID?: string; wide?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        flexBasis: wide ? '100%' : '47%', flexGrow: 1, minHeight: 122, borderRadius: R.lg, padding: S.md, gap: 6,
        backgroundColor: pressed ? C.cardPressed : C.card, borderWidth: 1, borderColor: pressed ? color : C.cardBorder, justifyContent: 'center',
        transform: [{ scale: pressed ? 0.98 : 1 }], ...(pressed ? glow(color, 0.3) : null),
      })}
    >
      <View style={{ width: 54, height: 54, borderRadius: R.lg, backgroundColor: color + '1f', borderWidth: 1, borderColor: color + '66', alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 30 }} maxFontSizeMultiplier={1.2}>{emoji}</Txt>
      </View>
      <Txt style={[T.headline, { fontSize: 18 }]} numberOfLines={2}>{label}</Txt>
      {sub ? <Txt style={[T.caption, { fontSize: 14, color: C.text2 }]} numberOfLines={1}>{sub}</Txt> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Eingaben
export function Field({
  label, hint, error, ok, style, right, ref, big, ...input
}: TextInputProps & {
  label?: string; hint?: string | null; error?: string | null; ok?: string | null; style?: StyleProp<ViewStyle>; right?: ReactNode;
  ref?: Ref<TextInputInstance>; big?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const rtl = isRTL();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Txt style={[T.sub, { color: C.text, fontWeight: '700' }]}>{label}</Txt> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.field, borderRadius: R.md, borderWidth: 2, borderColor: error ? C.red : focus ? C.accent : C.fieldBorder }}>
        <TextInput
          ref={ref}
          accessibilityLabel={label ?? input.placeholder}
          placeholderTextColor={C.text3}
          selectionColor={C.accent}
          keyboardAppearance="dark"
          autoCorrect={false}
          maxFontSizeMultiplier={1.6}
          {...input}
          onFocus={(e) => {
            setFocus(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            input.onBlur?.(e);
          }}
          style={[
            T.body,
            { flex: 1, minHeight: big ? 60 : 54, paddingHorizontal: 16, paddingVertical: 12, fontSize: big ? 20 : 18, textAlign: rtl ? 'right' : 'left' },
            input.multiline && { minHeight: 96, textAlignVertical: 'top' },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
        />
        {right}
      </View>
      {error ? (
        <Txt style={[T.sub, { color: C.red, fontWeight: '600' }]}>⚠️ {error}</Txt>
      ) : ok ? (
        <Txt style={[T.sub, { color: C.green, fontWeight: '700' }]}>✅ {ok}</Txt>
      ) : hint ? (
        <Txt style={T.sub}>{hint}</Txt>
      ) : null}
    </View>
  );
}

/** „Einfügen“-Knopf rechts im Eingabefeld */
export function PasteButton({ onPaste, testID }: { onPaste: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t('common.paste')}
      onPress={onPaste}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 6, paddingHorizontal: 12, minHeight: 44, borderRadius: R.sm,
        backgroundColor: pressed ? 'rgba(45,212,255,0.35)' : C.accentSoft,
      })}
    >
      <Txt style={{ fontSize: 16 }}>📋</Txt>
      <Txt style={[T.sub, { color: C.text, fontWeight: '800' }]}>{t('common.paste')}</Txt>
    </Pressable>
  );
}

/** große Auswahl-Knöpfe (statt kleiner Segmente) */
export function Choice<V extends string | number>({ options, value, onChange, columns = 2, testID }: {
  options: { value: V; label: string; emoji?: string; color?: string }[]; value: V | null; onChange: (v: V) => void; columns?: 2 | 3 | 4; testID?: string;
}) {
  const basis = columns === 4 ? '22%' : columns === 3 ? '30%' : '47%';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        const c = o.color ?? C.accent;
        return (
          <Pressable
            key={String(o.value)}
            testID={testID ? `${testID}-${o.value}` : undefined}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              if (!on) haptic.select();
              onChange(o.value);
            }}
            style={({ pressed }) => ({
              flexBasis: basis, flexGrow: 1, minHeight: 56, borderRadius: R.md, paddingHorizontal: 8, paddingVertical: 8,
              alignItems: 'center', justifyContent: 'center', gap: 2,
              backgroundColor: on ? c + '33' : pressed ? C.cardPressed : C.card2, borderWidth: 2, borderColor: on ? c : 'transparent',
            })}
          >
            {o.emoji ? <Txt style={{ fontSize: 22 }} maxFontSizeMultiplier={1.2}>{o.emoji}</Txt> : null}
            <Txt style={[T.sub, { color: C.text, fontWeight: on ? '800' : '600', textAlign: 'center' }]} numberOfLines={2}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Reiter oben auf einer Seite (z. B. Regeln: Wörter / Stumm / Verwarnt / Meldungen) */
export function Tabs<V extends string>({ options, value, onChange }: { options: { value: V; label: string; emoji?: string; count?: number }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={`tab-${o.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) haptic.select();
              onChange(o.value);
            }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 16, borderRadius: 24,
              backgroundColor: on ? C.accent : C.card2, borderWidth: 1, borderColor: on ? C.accent : C.cardBorder,
              ...(on ? glow(C.accent, 0.35) : null),
            }}
          >
            {o.emoji ? <Txt style={{ fontSize: 18 }} maxFontSizeMultiplier={1.2}>{o.emoji}</Txt> : null}
            <Txt style={[T.sub, { color: on ? C.onAccent : C.text, fontWeight: '800' }]} numberOfLines={1}>{o.label}{o.count !== undefined ? ` · ${o.count}` : ''}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Schalter im App-Stil */
export function AppSwitch({ value, onChange, disabled, testID, label }: {
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean; testID?: string; label?: string;
}) {
  // Schalter bleibt immer links→rechts (AN = rechts), auch bei Arabisch – wie die System-Schalter
  return (
    <View style={{ direction: 'ltr' }}>
    <Switch
      testID={testID}
      accessibilityLabel={label}
      value={value}
      disabled={disabled}
      onValueChange={(v) => {
        haptic.select();
        onChange(v);
      }}
      trackColor={{ true: C.green, false: 'rgba(255,255,255,0.22)' }}
      thumbColor="#fff"
      {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as object) : {})}
    />
    </View>
  );
}

export function ToggleRow({ emoji, label, hint, value, onChange, disabled, testID }: {
  emoji?: string; label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; testID?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 64, backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: S.lg, paddingVertical: S.sm }}>
      {emoji ? <Txt style={{ fontSize: 24 }}>{emoji}</Txt> : null}
      <View style={{ flex: 1 }}>
        <Txt style={[T.body, { fontWeight: '600' }]}>{label}</Txt>
        {hint ? <Txt style={T.sub}>{hint}</Txt> : null}
      </View>
      <AppSwitch value={value} onChange={onChange} disabled={disabled} testID={testID} label={label} />
    </View>
  );
}

/** antippbare Vorlagen („Ideen – tippe eine an“) */
export function Templates({ items, onPick, title }: { items: string[]; onPick: (text: string) => void; title?: string }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={[T.sub, { fontWeight: '700' }]}>💡 {title ?? t('common.ideas')}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {items.map((x) => (
          <Pressable
            key={x}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.add')}: ${x}`}
            onPress={() => {
              haptic.select();
              onPick(x);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 23, maxWidth: '100%',
              backgroundColor: pressed ? 'rgba(45,212,255,0.35)' : C.accentSoft, borderWidth: 1, borderColor: 'rgba(45,212,255,0.4)',
            })}
          >
            <Ionicons name="add-circle" size={20} color={C.accent} />
            <Txt style={[T.sub, { color: C.text, flexShrink: 1 }]} numberOfLines={2}>{x}</Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Zustände
export function Loading() {
  return (
    <View style={{ paddingVertical: 60, alignItems: 'center', gap: S.md }}>
      <ActivityIndicator color={C.accent} size="large" />
      <Txt style={T.sub}>{t('common.loading')}</Txt>
    </View>
  );
}

export function Empty({ emoji, title, text, action, onAction, testID }: { emoji: string; title: string; text?: string; action?: string; onAction?: () => void; testID?: string }) {
  return (
    <View testID={testID} style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: S.lg, gap: S.md }}>
      <Txt style={{ fontSize: 56 }} maxFontSizeMultiplier={1.2}>{emoji}</Txt>
      <Txt style={[T.big, { textAlign: 'center' }]}>{title}</Txt>
      {text ? <Txt style={[T.callout, { textAlign: 'center' }]}>{text}</Txt> : null}
      {action && onAction ? <Button label={action} icon="add" onPress={onAction} style={{ alignSelf: 'stretch', marginTop: S.sm }} /> : null}
    </View>
  );
}

/** freundlicher Fehler mit EINER klaren nächsten Aktion */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = (error as { code?: string })?.code === 'offline';
  return (
    <Card tone="bad">
      <View style={{ alignItems: 'center', gap: S.md }}>
        <Txt style={{ fontSize: 44 }} maxFontSizeMultiplier={1.2}>{offline ? '📡' : '😕'}</Txt>
        <Txt style={[T.body, { textAlign: 'center', fontWeight: '600' }]}>{errorText(error)}</Txt>
        {onRetry ? <Button label={t('common.retry')} icon="refresh" variant="secondary" onPress={onRetry} style={{ alignSelf: 'stretch' }} /> : null}
      </View>
    </Card>
  );
}

export function Note({ emoji = '💡', text, tone }: { emoji?: string; text: string; tone?: 'warn' | 'good' }) {
  const bg = tone === 'warn' ? C.orangeSoft : tone === 'good' ? C.greenSoft : C.accentSoft;
  return (
    <View style={{ flexDirection: 'row', gap: S.sm, backgroundColor: bg, borderRadius: R.md, padding: S.md, alignItems: 'flex-start' }}>
      <Txt style={{ fontSize: 20 }}>{emoji}</Txt>
      <Txt style={[T.callout, { color: C.text, flex: 1 }]}>{text}</Txt>
    </View>
  );
}

/** Zeile mit Code/Befehl zum Abschreiben */
export function CodeChip({ text }: { text: string }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: C.card2, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.cardBorder, direction: 'ltr' }}>
      <Txt selectable style={{ fontFamily: mono, color: C.accent, fontSize: 16, textAlign: 'left' }}>{text}</Txt>
    </View>
  );
}

/** großes Emoji in farbigem Feld (Bot-Gesicht) */
export function Face({ emoji, color, size = 64 }: { emoji: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: color + '2a', borderWidth: 2, borderColor: color + '66', alignItems: 'center', justifyContent: 'center' }}>
      <Txt style={{ fontSize: size * 0.52 }} maxFontSizeMultiplier={1}>{emoji}</Txt>
    </View>
  );
}

/** pulsierender Punkt (an = grün pulsierend) */
export function Pulse({ color, live, size = 12 }: { color: string; live: boolean; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!live) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [live]);
  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      {live ? (
        <Animated.View
          style={{
            position: 'absolute', width: size * 2, height: size * 2, borderRadius: size, backgroundColor: color,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }],
          }}
        />
      ) : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

export const hairline = StyleSheet.hairlineWidth;

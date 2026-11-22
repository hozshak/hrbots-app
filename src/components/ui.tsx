// Bausteine der Oberfläche: Glas-Karten, Knöpfe, Eingabefelder, Umschalter, Status-Punkt, Bot-Symbol.
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View,
  type StyleProp, type TextInputInstance, type TextInputProps, type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BotKind, BotStatus } from '@/api';
import { C, KIND_COLOR, R, S, STATUS_COLOR, T } from '@/lib/theme';
import { haptic } from '@/lib/ui';

export type IconName = keyof typeof Ionicons.glyphMap;

/** dezente Farbschimmer hinter dem Inhalt, damit die Glas-Karten etwas zum Verwischen haben */
export function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['rgba(110,123,255,0.20)', 'rgba(110,123,255,0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.6, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(228,108,255,0)', 'rgba(228,108,255,0.08)']}
        start={{ x: 0.2, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export function Glass({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return (
    <View style={[styles.glass, style]}>
      <BlurView intensity={Platform.OS === 'ios' ? 40 : 24} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[{ backgroundColor: C.card }, StyleSheet.absoluteFill]} />
      <View style={padded ? { padding: S.lg } : undefined}>{children}</View>
    </View>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
export function Button({
  label, onPress, variant = 'primary', icon, loading, disabled, small, style, testID,
}: {
  label: string; onPress?: () => void; variant?: BtnVariant; icon?: IconName; loading?: boolean; disabled?: boolean;
  small?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 0 }).start();
  const bg = { primary: C.accent, secondary: 'rgba(255,255,255,0.09)', danger: C.redSoft, ghost: 'transparent', success: 'rgba(52,211,153,0.16)' }[variant];
  const fg = { primary: C.onAccent, secondary: C.text, danger: C.red, ghost: C.accent, success: C.green }[variant];
  const off = disabled || loading;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!off }}
        disabled={off}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        onPress={() => {
          haptic.tap();
          onPress?.();
        }}
        style={[styles.btn, small && styles.btnSmall, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
            <Text numberOfLines={1} style={[T.headline, { color: fg, fontSize: small ? 14 : 16 }]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({ icon, onPress, label, color = C.text, bg = 'rgba(255,255,255,0.08)', size = 38, disabled, testID }: {
  icon: IconName; onPress: () => void; label: string; color?: string; bg?: string; size?: number; disabled?: boolean; testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </Pressable>
  );
}

export function Field({
  label, hint, error, ok, style, right, ref, ...input
}: TextInputProps & {
  label?: string; hint?: string; error?: string | null; ok?: string | null; style?: StyleProp<ViewStyle>; right?: ReactNode; ref?: Ref<TextInputInstance>;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text style={T.sub}>{label}</Text> : null}
      <View style={[styles.field, focus && { borderColor: C.accent }, error ? { borderColor: C.red } : null]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label ?? input.placeholder}
          placeholderTextColor={C.text3}
          selectionColor={C.accent}
          keyboardAppearance="dark"
          autoCorrect={false}
          {...input}
          onFocus={(e) => {
            setFocus(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            input.onBlur?.(e);
          }}
          style={[T.body, styles.input, input.multiline && { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
        />
        {right}
      </View>
      {error ? (
        <Text style={[T.sub, { color: C.red }]}>{error}</Text>
      ) : ok ? (
        <Text style={[T.sub, { color: C.green }]}>✓ {ok}</Text>
      ) : hint ? (
        <Text style={T.sub}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Segmented<V extends string>({ options, value, onChange, disabled }: {
  options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; disabled?: boolean;
}) {
  return (
    <View style={[styles.seg, disabled && { opacity: 0.4 }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            disabled={disabled}
            onPress={() => {
              if (!on) haptic.select();
              onChange(o.value);
            }}
            style={[styles.segItem, on && styles.segOn]}
          >
            <Text numberOfLines={1} style={[T.sub, { color: on ? C.text : C.text2, fontWeight: on ? '600' : '500' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Section({ title, hint, children, right }: { title: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ gap: S.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Text style={T.section}>{title}</Text>
        {right}
      </View>
      <Glass>{children}</Glass>
      {hint ? <Text style={[T.sub, { paddingHorizontal: 4, color: C.text3 }]}>{hint}</Text> : null}
    </View>
  );
}

export function Row({ label, value, onPress, icon, danger, last, right }: {
  label: string; value?: string; onPress?: () => void; icon?: IconName; danger?: boolean; last?: boolean; right?: ReactNode;
}) {
  const content = (
    <View style={[styles.row, !last && styles.rowSep]}>
      {icon ? <Ionicons name={icon} size={20} color={danger ? C.red : C.text2} /> : null}
      <Text style={[T.body, { flex: 1, color: danger ? C.red : C.text }]} numberOfLines={1}>{label}</Text>
      {value ? <Text style={[T.callout, { maxWidth: '55%' }]} numberOfLines={1}>{value}</Text> : null}
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={C.text3} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {content}
    </Pressable>
  );
}

/** Schalter im App-Stil (auch im Browser mit weißem Knopf statt Material-Grün) */
export function AppSwitch({ value, onChange, disabled, big, testID, label }: {
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean; big?: boolean; testID?: string; label?: string;
}) {
  return (
    <Switch
      testID={testID}
      accessibilityLabel={label}
      style={big ? { transform: [{ scale: Platform.OS === 'ios' ? 1.25 : 1.35 }], marginHorizontal: 6 } : undefined}
      value={value}
      disabled={disabled}
      onValueChange={(v) => {
        haptic.select();
        onChange(v);
      }}
      trackColor={{ true: C.accent, false: 'rgba(255,255,255,0.16)' }}
      thumbColor="#fff"
      {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as object) : {})}
    />
  );
}

export function Toggle({ label, value, onChange, hint, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 }}>
      <View style={{ flex: 1 }}>
        <Text style={T.body}>{label}</Text>
        {hint ? <Text style={T.sub}>{hint}</Text> : null}
      </View>
      <AppSwitch value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

export function Chip({ label, onRemove, color = C.text }: { label: string; onRemove?: () => void; color?: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[T.sub, { color }]} numberOfLines={1}>{label}</Text>
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={10} onPress={onRemove}>
          <Ionicons name="close-circle" size={17} color={C.text3} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatusDot({ status, pending, size = 10 }: { status: BotStatus; pending?: boolean; size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const live = pending || status === 'running';
  useEffect(() => {
    if (!live) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: pending ? 900 : 1800, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    );
    loop.start();
    return () => loop.stop();
  }, [live, pending]);
  const color = pending ? C.yellow : STATUS_COLOR[status];
  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      {live ? (
        <Animated.View
          style={{
            position: 'absolute', width: size * 2, height: size * 2, borderRadius: size, backgroundColor: color,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }],
          }}
        />
      ) : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

export const KIND_ICON: Record<BotKind, IconName> = { welcome: 'hand-left', mod: 'shield-checkmark', music: 'musical-notes' };

export function KindIcon({ kind, size = 44 }: { kind: BotKind; size?: number }) {
  const c = KIND_COLOR[kind];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: c + '22', borderWidth: StyleSheet.hairlineWidth, borderColor: c + '55', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={KIND_ICON[kind]} size={size * 0.5} color={c} />
    </View>
  );
}

export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: S.md }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={34} color={C.accent} />
      </View>
      <Text style={[T.title, { textAlign: 'center' }]}>{title}</Text>
      {text ? <Text style={[T.callout, { textAlign: 'center' }]}>{text}</Text> : null}
      {children}
    </View>
  );
}

export function ErrorBox({ text, onRetry, retryLabel }: { text: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <Glass style={{ borderColor: 'rgba(255,95,109,0.35)' }}>
      <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
        <Ionicons name="alert-circle" size={22} color={C.red} />
        <Text style={[T.callout, { flex: 1, color: C.text }]}>{text}</Text>
      </View>
      {onRetry ? <Button label={retryLabel ?? 'Retry'} variant="secondary" small onPress={onRetry} style={{ marginTop: S.md, alignSelf: 'flex-start' }} /> : null}
    </Glass>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginVertical: S.md }} />;
}

const styles = StyleSheet.create({
  glass: { borderRadius: R.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.cardBorder },
  btn: { minHeight: 50, borderRadius: R.md, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSmall: { minHeight: 40, paddingHorizontal: 14, borderRadius: R.sm },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.field, borderRadius: R.md, borderWidth: 1, borderColor: C.fieldBorder },
  input: { flex: 1, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) },
  seg: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: R.sm + 2, padding: 3, gap: 3 },
  segItem: { flex: 1, minHeight: 36, borderRadius: R.sm - 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segOn: { backgroundColor: 'rgba(255,255,255,0.14)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 48 },
  rowSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 8, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)' },
});

/** Große Seitenüberschrift (wie in iOS-Apps) mit optionalem Knopf rechts */
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.md, paddingBottom: S.sm }}>
      <View style={{ flex: 1 }}>
        <Text style={T.largeTitle} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={[T.callout, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

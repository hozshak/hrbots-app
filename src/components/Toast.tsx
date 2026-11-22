import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { hideToast, useToast } from '@/lib/toast';
import { C, R, T } from '@/lib/theme';
import { dirStyle, Txt } from './ui';

export function ToastHost() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: toast ? 1 : 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [toast?.id]);
  if (!toast) return null;
  const icon = toast.kind === 'error' ? 'alert-circle' : toast.kind === 'success' ? 'checkmark-circle' : 'information-circle';
  const color = toast.kind === 'error' ? C.red : toast.kind === 'success' ? C.green : C.accent;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + 8, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] },
      ]}
    >
      <Pressable onPress={hideToast} accessibilityRole="alert" style={[styles.box, dirStyle()]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,22,29,0.82)' }]} />
        <Ionicons name={icon} size={24} color={color} />
        <Txt style={[T.callout, { color: C.text, flex: 1, fontWeight: '600' }]}>{toast.text}</Txt>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 1000 },
  box: {
    maxWidth: 520, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: R.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.cardBorder,
  },
});

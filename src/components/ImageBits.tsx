// Bilder: anhängen (Knopf + Vorschau + entfernen) und anzeigen (antippen = groß).
import { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { t } from '@/lib/i18n';
import { pickImage, PickError } from '@/lib/media';
import { haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, R, S } from '@/lib/theme';
import { Button, IconBtn } from './ui';

export async function chooseImage(): Promise<string | null> {
  try {
    return await pickImage();
  } catch (e) {
    haptic.error();
    const r = e instanceof PickError ? e.reason : 'failed';
    toast(r === 'too_big' ? t('img.tooBig') : r === 'no_access' ? t('img.noAccess') : t('img.failed'), 'error');
    return null;
  }
}

/** Knopf „Bild dazutun“; mit Bild: kleine Vorschau + „Anderes Bild“ + Entfernen */
export function ImageAttach({ value, onChange, testID, small }: { value: string | null; onChange: (v: string | null) => void; testID?: string; small?: boolean }) {
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    setBusy(true);
    const v = await chooseImage();
    setBusy(false);
    if (v) onChange(v);
  };
  if (!value) {
    return <Button label={t('img.add')} emoji="🖼️" variant="secondary" small={small} loading={busy} onPress={pick} testID={testID} />;
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
      <Picture uri={value} size={small ? 64 : 88} />
      <View style={{ flex: 1, gap: S.sm }}>
        <Button label={t('img.change')} emoji="🖼️" variant="secondary" small loading={busy} onPress={pick} testID={testID ? `${testID}-change` : undefined} />
      </View>
      <IconBtn icon="close" label={t('img.remove')} onPress={() => onChange(null)} testID={testID ? `${testID}-remove` : undefined} />
    </View>
  );
}

/** Bild als Kachel; antippen öffnet es groß (Vollbild, Tippen schließt) */
export function Picture({ uri, size = 160, wide }: { uri: string; size?: number; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="imagebutton" accessibilityLabel={t('img.show')} onPress={() => setOpen(true)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, borderRadius: R.md, overflow: 'hidden', borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.logBg, alignSelf: 'flex-start' })}>
        <Image source={{ uri }} style={wide ? { width: 240, height: size } : { width: size, height: size }} resizeMode="cover" accessibilityIgnoresInvertColors />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: S.lg }}>
          <Image source={{ uri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={{ position: 'absolute', top: 56, right: 20 }}>
            <Ionicons name="close-circle" size={40} color={C.white} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

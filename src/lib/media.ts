// Dateien wählen: Bild (Support-Nachricht, Hilfe-Roboter) und MP3 (Lieder für den DJ).
// Bilder werden verkleinert und als JPEG-Data-URL geliefert – wie das Web-Formular, höchstens 800 000 Zeichen (Server-Regel).
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { EXTRA_LIMITS, type UploadFile } from '@/api';

export class PickError extends Error {
  constructor(public reason: 'too_big' | 'no_access' | 'failed' | 'not_mp3') {
    super(reason);
  }
}

/** Foto aus der Mediathek → `data:image/jpeg;base64,…` (oder null, wenn abgebrochen). */
export async function pickImage(): Promise<string | null> {
  let res: ImagePicker.ImagePickerResult;
  try {
    res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false, exif: false });
  } catch {
    throw new PickError('no_access');
  }
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  try {
    // erst groß, dann kleiner, bis es passt (Screenshots sind meist schon bei 1280 px klein genug)
    for (const width of [1280, 960, 720, 540]) {
      const ctx = ImageManipulator.manipulate(a.uri);
      if (!a.width || a.width > width) ctx.resize({ width });
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
      if (!out.base64) continue;
      const dataUrl = `data:image/jpeg;base64,${out.base64}`;
      if (dataUrl.length <= EXTRA_LIMITS.imageChars) return dataUrl;
    }
  } catch {
    throw new PickError('failed');
  }
  throw new PickError('too_big');
}

/** MP3 aus „Dateien“ wählen → Upload-Datei (oder null, wenn abgebrochen). Prüft Endung und Größe vorher. */
export async function pickMp3(): Promise<UploadFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['audio/mpeg', 'audio/mp3', '.mp3'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  if (!a.name.toLowerCase().endsWith('.mp3')) throw new PickError('not_mp3');
  const size = a.size ?? (a.file ? a.file.size : null);
  if (size != null && (size <= 0 || size > EXTRA_LIMITS.autoplayBytes)) throw new PickError('too_big');
  return { uri: a.uri, name: a.name, size, mimeType: 'audio/mpeg', file: Platform.OS === 'web' ? a.file ?? null : null };
}

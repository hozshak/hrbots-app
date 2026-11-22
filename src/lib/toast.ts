// Kurze Meldung oben im Bild (z. B. „Gesichert“, Fehlertexte).
import { useSyncExternalStore } from 'react';

export type ToastKind = 'info' | 'success' | 'error';
type Toast = { id: number; text: string; kind: ToastKind } | null;
let current: Toast = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function toast(text: string, kind: ToastKind = 'info', ms = kind === 'error' ? 4500 : 2200) {
  current = { id: ++seq, text, kind };
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, ms);
}

export function hideToast() {
  current = null;
  emit();
}

export function useToast() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
  );
}

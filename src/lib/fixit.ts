// „Beheben“-Blatt: öffnet sich, wenn ein Bot nach dem Start abstürzt/offline bleibt oder der Bot-Server nicht antwortet.
import { useSyncExternalStore } from 'react';
import type { Bot } from '@/api';

export type FixReason = 'crashed' | 'agent';
type State = { bot: Bot; reason: FixReason } | null;
let state: State = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function openFixIt(bot: Bot, reason: FixReason) {
  state = { bot, reason };
  emit();
}
export function closeFixIt() {
  state = null;
  emit();
}
export function useFixIt() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );
}

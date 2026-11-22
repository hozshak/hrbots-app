// Anmeldezustand der App. Fehler „unauthorized“ → zurück zur Anmeldung, „discord_required“ → Discord-Seite.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { account, auth, loadToken, saveToken, setErrorHooks, ApiError, type User } from '@/api';
import { queryClient } from './query';

type State = { phase: 'booting' | 'out' | 'in'; user: User | null };
let state: State = { phase: 'booting', user: null };
const subs = new Set<() => void>();
function set(next: Partial<State>) {
  state = { ...state, ...next };
  subs.forEach((f) => f());
}
export function useSession() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );
}

async function signedOut() {
  await saveToken(null);
  queryClient.clear();
  set({ phase: 'out', user: null });
}

setErrorHooks({
  unauthorized: () => {
    if (state.phase === 'in') signedOut();
  },
  discordRequired: () => {
    if (state.user?.discord_linked) set({ user: { ...state.user, discord_linked: false } });
  },
});

export async function boot() {
  const tok = await loadToken();
  if (!tok) return set({ phase: 'out' });
  try {
    const me = await account.me();
    queryClient.setQueryData(['me'], me);
    set({ phase: 'in', user: me.user });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'unauthorized') return signedOut();
    // offline o. Ä.: Token behalten, angemeldet weiter (Daten laden dann neu)
    set({ phase: 'in', user: state.user ?? { id: 0, username: '', discord_linked: true } });
  }
}

export async function signIn(username: string, password: string) {
  const deviceName = Platform.OS === 'web' ? 'HR Bots (web)' : `HR Bots (${Application.applicationName ?? 'iPhone'})`;
  const user = await auth.login(username.trim(), password, deviceName);
  queryClient.clear();
  set({ phase: 'in', user });
}

/** /me neu laden, z. B. nach dem Verknüpfen von Discord */
export async function refreshMe() {
  const me = await account.me();
  queryClient.setQueryData(['me'], me);
  set({ user: me.user });
  return me;
}

export async function signOut() {
  try {
    await auth.logout();
  } catch {}
  await signedOut();
}

export async function deleteAccount(password: string) {
  await account.deleteAccount(password);
  await signedOut();
}

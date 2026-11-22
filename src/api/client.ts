// Typisierte Aufrufe für jeden Endpunkt aus API.md. Pfade relativ zu /api/v1.
import { request, saveToken } from './transport';
import type {
  ActionResult, BannedAction, Bot, BotDetail, BotKind, CreateBotInput, Me, MinRole, ModRole, MusicAction, MusicRole, Ok,
  PowerAction, PresenceEvent, UpdateBotInput, User,
} from './types';

const e = encodeURIComponent;
const stamp = <T extends Bot>(b: T): T => ({ ...b, received_at: Date.now() });

export const auth = {
  async login(username: string, password: string, device_name?: string) {
    const r = await request<{ token: string; user: User }>('POST', '/auth/login', { username, password, device_name });
    await saveToken(r.token);
    return r.user;
  },
  async logout() {
    try {
      await request<Ok>('POST', '/auth/logout');
    } finally {
      await saveToken(null);
    }
  },
};

export const account = {
  me: () => request<Me>('GET', '/me'),
  async deleteAccount(password: string) {
    const r = await request<Ok>('POST', '/me/delete', { password });
    await saveToken(null);
    return r;
  },
};

export const bots = {
  list: async () => (await request<{ bots: Bot[] }>('GET', '/bots')).bots.map(stamp),
  create: async (input: CreateBotInput) => stamp((await request<{ bot: Bot }>('POST', '/bots', input)).bot),
  get: async (kind: BotKind, id: number) => {
    const r = await request<BotDetail>('GET', `/bots/${kind}/${id}`);
    return { ...r, bot: stamp(r.bot) } as BotDetail;
  },
  update: async (kind: BotKind, id: number, patch: UpdateBotInput) =>
    stamp((await request<{ bot: Bot }>('PATCH', `/bots/${kind}/${id}`, patch)).bot),
  remove: (kind: BotKind, id: number) => request<Ok>('DELETE', `/bots/${kind}/${id}`),
  power: (kind: BotKind, id: number, action: PowerAction) => request<ActionResult>('POST', `/bots/${kind}/${id}/${action}`),
  logs: async (kind: BotKind, id: number) => (await request<{ lines: string[] }>('GET', `/bots/${kind}/${id}/logs`)).lines,
  presence: async (kind: BotKind, id: number) =>
    (await request<{ events: PresenceEvent[] }>('GET', `/bots/${kind}/${id}/presence`)).events,
};

export const welcome = {
  addMessage: (id: number, message: string, target_username?: string) =>
    request<Ok>('POST', `/bots/welcome/${id}/messages`, { message, ...(target_username ? { target_username } : {}) }),
  updateMessage: (id: number, mid: number, patch: { message?: string; active?: boolean }) =>
    request<Ok>('PATCH', `/bots/welcome/${id}/messages/${mid}`, patch),
  deleteMessage: (id: number, mid: number) => request<Ok>('DELETE', `/bots/welcome/${id}/messages/${mid}`),
  addAdmin: (id: number, username: string) => request<Ok>('POST', `/bots/welcome/${id}/admins`, { username }),
  removeAdmin: (id: number, username: string) => request<Ok>('DELETE', `/bots/welcome/${id}/admins/${e(username)}`),
};

export const mod = {
  addRole: (id: number, role: ModRole, username: string) => request<Ok>('POST', `/bots/mod/${id}/roles`, { role, username }),
  removeRole: (id: number, role: ModRole, username: string) =>
    request<Ok>('DELETE', `/bots/mod/${id}/roles/${role}/${e(username)}`),
  addBannedWord: (id: number, word: string, action: BannedAction) =>
    request<Ok>('POST', `/bots/mod/${id}/banned_words`, { word, action }),
  removeBannedWord: (id: number, word: string) => request<Ok>('DELETE', `/bots/mod/${id}/banned_words/${e(word)}`),
  addWelcome: (id: number, message: string, target_username?: string) =>
    request<Ok>('POST', `/bots/mod/${id}/welcomes`, { message, ...(target_username ? { target_username } : {}) }),
  removeWelcome: (id: number, wid: number) => request<Ok>('DELETE', `/bots/mod/${id}/welcomes/${wid}`),
  addDestination: (id: number, d: { name: string; x: number; y: number; z: number; min_role: MinRole }) =>
    request<Ok>('POST', `/bots/mod/${id}/destinations`, d),
  removeDestination: (id: number, did: number) => request<Ok>('DELETE', `/bots/mod/${id}/destinations/${did}`),
};

export const music = {
  addRole: (id: number, role: MusicRole, username: string) => request<Ok>('POST', `/bots/music/${id}/roles`, { role, username }),
  removeRole: (id: number, role: MusicRole, username: string) =>
    request<Ok>('DELETE', `/bots/music/${id}/roles/${role}/${e(username)}`),
  setAnnouncements: (id: number, lines: string[], interval_sec: number) =>
    request<Ok>('PUT', `/bots/music/${id}/announcements`, { lines, interval_sec }),
  setSettings: (id: number, s: { max_song_minutes?: number; autoplay?: boolean }) =>
    request<Ok>('PUT', `/bots/music/${id}/settings`, s),
  command: (id: number, action: MusicAction, query?: string) =>
    request<Ok>('POST', `/bots/music/${id}/command`, { action, ...(query ? { query } : {}) }),
};

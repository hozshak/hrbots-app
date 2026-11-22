// Typisierte Aufrufe für jeden Endpunkt aus API.md. Pfade relativ zu /api/v1.
// Antwort-Typen genau wie der Server (worker/src/routes/api_v1.ts) sie liefert.
import { request, saveToken } from './transport';
import type {
  ActionResult, AdminResult, AnnouncementsResult, BannedAction, BannedWordResult, Bot, BotDetail, BotKind, CommandResult,
  CreateBotInput, DestinationResult, LoginResult, Me, MessageResult, MinRole, ModRole, ModWelcomeResult, MusicAction,
  MusicRole, MusicSettingsResult, Ok, PowerAction, PresenceEvent, RoleResult, UpdateBotInput, UpdateBotResult,
} from './types';

const e = encodeURIComponent;
const stamp = <T extends Bot>(b: T): T => ({ ...b, received_at: Date.now() });

export const auth = {
  async login(username: string, password: string, device_name?: string) {
    const r = await request<LoginResult>('POST', '/auth/login', { username, password, ...(device_name ? { device_name: device_name.slice(0, 60) } : {}) });
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
  /** 201 {bot} */
  create: async (input: CreateBotInput) => stamp((await request<{ bot: Bot }>('POST', '/bots', input)).bot),
  get: async (kind: BotKind, id: number) => {
    const r = await request<BotDetail>('GET', `/bots/${kind}/${id}`);
    return { ...r, bot: stamp(r.bot) } as BotDetail;
  },
  /** {bot, restarted} – liefert nur den Bot zurück (restarted ist für die Anzeige nicht nötig) */
  update: async (kind: BotKind, id: number, patch: UpdateBotInput) =>
    stamp((await request<UpdateBotResult>('PATCH', `/bots/${kind}/${id}`, patch)).bot),
  remove: (kind: BotKind, id: number) => request<Ok>('DELETE', `/bots/${kind}/${id}`),
  /** 402 no_runtime · 502 agent_unreachable */
  power: (kind: BotKind, id: number, action: PowerAction) => request<ActionResult>('POST', `/bots/${kind}/${id}/${action}`),
  /** 502 agent_unreachable, wenn der Bot-Server nicht antwortet */
  logs: async (kind: BotKind, id: number) => (await request<{ lines: string[] }>('GET', `/bots/${kind}/${id}/logs`)).lines,
  presence: async (kind: BotKind, id: number) =>
    (await request<{ events: PresenceEvent[] }>('GET', `/bots/${kind}/${id}/presence`)).events,
};

const withTarget = (target_username?: string) => (target_username ? { target_username } : {});

export const welcome = {
  addMessage: (id: number, message: string, target_username?: string) =>
    request<MessageResult>('POST', `/bots/welcome/${id}/messages`, { message, ...withTarget(target_username) }),
  updateMessage: (id: number, mid: number, patch: { message?: string; active?: boolean }) =>
    request<MessageResult>('PATCH', `/bots/welcome/${id}/messages/${mid}`, patch),
  deleteMessage: (id: number, mid: number) => request<Ok>('DELETE', `/bots/welcome/${id}/messages/${mid}`),
  addAdmin: (id: number, username: string) => request<AdminResult>('POST', `/bots/welcome/${id}/admins`, { username }),
  removeAdmin: (id: number, username: string) => request<Ok>('DELETE', `/bots/welcome/${id}/admins/${e(username)}`),
};

export const mod = {
  addRole: (id: number, role: ModRole, username: string) =>
    request<RoleResult<ModRole>>('POST', `/bots/mod/${id}/roles`, { role, username }),
  removeRole: (id: number, role: ModRole, username: string) =>
    request<RoleResult<ModRole>>('DELETE', `/bots/mod/${id}/roles/${role}/${e(username)}`),
  addBannedWord: (id: number, word: string, action: BannedAction) =>
    request<BannedWordResult>('POST', `/bots/mod/${id}/banned_words`, { word, action }),
  removeBannedWord: (id: number, word: string) => request<Ok>('DELETE', `/bots/mod/${id}/banned_words/${e(word)}`),
  addWelcome: (id: number, message: string, target_username?: string) =>
    request<ModWelcomeResult>('POST', `/bots/mod/${id}/welcomes`, { message, ...withTarget(target_username) }),
  removeWelcome: (id: number, wid: number) => request<Ok>('DELETE', `/bots/mod/${id}/welcomes/${wid}`),
  addDestination: (id: number, d: { name: string; x: number; y: number; z: number; min_role: MinRole }) =>
    request<DestinationResult>('POST', `/bots/mod/${id}/destinations`, d),
  removeDestination: (id: number, did: number) => request<Ok>('DELETE', `/bots/mod/${id}/destinations/${did}`),
};

export const music = {
  addRole: (id: number, role: MusicRole, username: string) =>
    request<RoleResult<MusicRole>>('POST', `/bots/music/${id}/roles`, { role, username }),
  removeRole: (id: number, role: MusicRole, username: string) =>
    request<RoleResult<MusicRole>>('DELETE', `/bots/music/${id}/roles/${role}/${e(username)}`),
  setAnnouncements: (id: number, lines: string[], interval_sec: number) =>
    request<AnnouncementsResult>('PUT', `/bots/music/${id}/announcements`, { lines, interval_sec }),
  setSettings: (id: number, s: { max_song_minutes?: number; autoplay?: boolean }) =>
    request<MusicSettingsResult>('PUT', `/bots/music/${id}/settings`, s),
  /** 409 bot_not_running, wenn der Bot nicht läuft */
  command: (id: number, action: MusicAction, query?: string) =>
    request<CommandResult>('POST', `/bots/music/${id}/command`, { action, ...(query ? { query } : {}) }),
};

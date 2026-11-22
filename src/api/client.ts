// Typisierte Aufrufe für jeden Endpunkt aus API.md. Pfade relativ zu /api/v1.
// Alle Formen nach API.md (Stand 23.11.2026); der Mock (mock.ts) spielt sie nach.
// Gold-Felder/Endpunkte (Preise, Mieten, VIP-Preis, Gold pro Ticket) nutzt die App bewusst NICHT (App-Store-Regel 3.1.3(f)).
import { request, saveToken } from './transport';
import type {
  ActionResult, AdminResult, AnnouncementsResult, AutoplayFile, BannedAction, BannedWordResult, Bot, BotDetail, BotKind,
  ChatMessage, CommandResult, CreateBotInput, DestinationResult, DiscordInfo, HighriseLink, LoginResult, Me, MessageResult, MinRole,
  ModOutfit, ModRole, ModWelcomeResult, MusicAction, MusicRecentCommand, MusicRole, MusicSettingsResult, MusicTicket, Ok,
  PowerAction, PresenceEvent, RadioStation, RadioStatus, RoleResult, SupportReply, SupportTicket, SupportTicketDetail, TrackedUser,
  UpdateBotInput, UpdateBotResult, VipZone, Wallet,
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
  /** 400 invalid_input (4–200 Zeichen) · 401 invalid_credentials (aktuelles falsch) · 429 */
  changePassword: (current_password: string, new_password: string) =>
    request<Ok>('POST', '/me/password', { current_password, new_password }),
  highriseLink: () => request<HighriseLink>('GET', '/me/link'),
  /** Code (6 Zeichen) aus dem Bank-Raum · 400 invalid_code · 409 already_linked / code_used / highrise_account_taken · 429.
   *  `claimed_gold` der Antwort zeigt die App bewusst nicht an. */
  linkHighrise: (code: string) => request<{ ok: true; highrise_username: string }>('POST', '/me/link', { code: code.trim().toUpperCase() }),
  /** auch ohne Discord erlaubt; Verbinden geht nur im Browser (verify_url) */
  discord: () => request<DiscordInfo>('GET', '/me/discord'),
  /** nur ansehen (kein Kaufen/Mieten in der App) */
  wallet: () => request<Wallet>('GET', '/me/wallet'),
};

export const bots = {
  list: async () => (await request<{ bots: Bot[] }>('GET', '/bots')).bots.map(stamp),
  /** 201 {bot} */
  create: async (input: CreateBotInput) => stamp((await request<{ bot: Bot }>('POST', '/bots', input)).bot),
  get: async (kind: BotKind, id: number) => {
    const r = await request<BotDetail>('GET', `/bots/${kind}/${id}`);
    return { ...r, bot: stamp(r.bot) } as BotDetail;
  },
  /** {bot, restarted} – liefert nur den Bot zurück */
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
  /** Beobachten (Positions-Tracking wie -posuser) */
  addTracking: async (id: number, username: string) =>
    (await request<{ tracking: TrackedUser }>('POST', `/bots/welcome/${id}/tracking`, { username })).tracking,
  setTracking: (id: number, tid: number, active: boolean) => request<{ tracking: TrackedUser }>('PATCH', `/bots/welcome/${id}/tracking/${tid}`, { active }),
  removeTracking: (id: number, tid: number) => request<Ok>('DELETE', `/bots/welcome/${id}/tracking/${tid}`),
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
  updateWelcome: (id: number, wid: number, patch: { message?: string; active?: boolean }) =>
    request<ModWelcomeResult>('PATCH', `/bots/mod/${id}/welcomes/${wid}`, patch),
  removeWelcome: (id: number, wid: number) => request<Ok>('DELETE', `/bots/mod/${id}/welcomes/${wid}`),
  addDestination: (id: number, d: { name: string; x: number; y: number; z: number; min_role: MinRole }) =>
    request<DestinationResult>('POST', `/bots/mod/${id}/destinations`, d),
  removeDestination: (id: number, did: number) => request<Ok>('DELETE', `/bots/mod/${id}/destinations/${did}`),
  /** Raum-Besitzer ("" = keiner) – über PATCH /bots/mod/:id */
  setOwner: (id: number, owner_username: string) => request<UpdateBotResult>('PATCH', `/bots/mod/${id}`, { owner_username }),
  /** Chat-Wörter für Gehen/Teleport ("" = Standard) */
  setCommands: (id: number, go: string, tp: string) => request<{ commands: { go: string; tp: string } }>('PUT', `/bots/mod/${id}/commands`, { go, tp }),
  unmute: (id: number, username: string) => request<Ok>('DELETE', `/bots/mod/${id}/mutes/${e(username)}`),
  clearWarns: (id: number, username: string) => request<Ok>('DELETE', `/bots/mod/${id}/warns/${e(username)}`),
  closeReport: (id: number, rid: number) => request<Ok>('POST', `/bots/mod/${id}/reports/${rid}/close`),
  /** Beobachten (nur Namen) */
  addTracking: (id: number, username: string) => request<{ ok: true; username: string; users: string[] }>('POST', `/bots/mod/${id}/tracking`, { username }),
  removeTracking: (id: number, username: string) => request<{ ok: true; users: string[] }>('DELETE', `/bots/mod/${id}/tracking/${e(username)}`),
  /** VIP-Bereiche (Mitte x/z + Radius → Quadrat) */
  addVipZone: async (id: number, z: { name: string; x: number; z: number; radius: number }) =>
    (await request<{ zone: VipZone }>('POST', `/bots/mod/${id}/vip_zones`, z)).zone,
  removeVipZone: (id: number, zid: number) => request<Ok>('DELETE', `/bots/mod/${id}/vip_zones/${zid}`),
  /** NUR safe_spot – `price` (Gold) schickt die App nie */
  setVipSafe: (id: number, safe_spot: { x: number; y: number; z: number } | null) => request<unknown>('PUT', `/bots/mod/${id}/vip`, { safe_spot }),
  setOutfitSettings: (id: number, s: { rotate?: boolean; interval_minutes?: number }) =>
    request<{ rotate: boolean; interval_minutes: number }>('PUT', `/bots/mod/${id}/outfit_settings`, s),
  addOutfit: async (id: number, name: string, items: string[]) => (await request<{ outfit: ModOutfit }>('POST', `/bots/mod/${id}/outfits`, { name, items })).outfit,
  removeOutfit: (id: number, oid: number) => request<Ok>('DELETE', `/bots/mod/${id}/outfits/${oid}`),
  clearOutfits: (id: number) => request<Ok>('DELETE', `/bots/mod/${id}/outfits`),
};

export const music = {
  addRole: (id: number, role: MusicRole, username: string) =>
    request<RoleResult<MusicRole>>('POST', `/bots/music/${id}/roles`, { role, username }),
  removeRole: (id: number, role: MusicRole, username: string) =>
    request<RoleResult<MusicRole>>('DELETE', `/bots/music/${id}/roles/${role}/${e(username)}`),
  setAnnouncements: (id: number, lines: string[], interval_sec: number) =>
    request<AnnouncementsResult>('PUT', `/bots/music/${id}/announcements`, { lines, interval_sec }),
  /** nur max_song_minutes/autoplay – gold_per_ticket schickt die App nie */
  setSettings: (id: number, s: { max_song_minutes?: number; autoplay?: boolean }) =>
    request<MusicSettingsResult>('PUT', `/bots/music/${id}/settings`, s),
  /** 409 bot_not_running, wenn der Bot nicht läuft */
  command: (id: number, action: MusicAction, query?: string) =>
    request<CommandResult>('POST', `/bots/music/${id}/command`, { action, ...(query ? { query } : {}) }),
  /** gesperrte Nutzer (dürfen sich keine Lieder wünschen) */
  block: (id: number, username: string) => request<Ok>('POST', `/bots/music/${id}/blocked`, { username }),
  unblock: (id: number, username: string) => request<Ok>('DELETE', `/bots/music/${id}/blocked/${e(username)}`),
  /** Raum-Besitzer ("" = keiner) – über PATCH /bots/music/:id */
  setOwner: (id: number, owner_username: string) => request<UpdateBotResult>('PATCH', `/bots/music/${id}`, { owner_username }),
  /** Song-Tickets ansehen und von Hand geben/abziehen (ohne Preise) */
  tickets: async (id: number) => (await request<{ tickets: MusicTicket[] }>('GET', `/bots/music/${id}/tickets`)).tickets,
  changeTickets: (id: number, username: string, delta: number) =>
    request<{ ok: true; username: string; tickets: number }>('POST', `/bots/music/${id}/tickets`, { username, delta }),
  /** letzte 15 Live-Befehle */
  recentCommands: async (id: number) => (await request<{ commands: MusicRecentCommand[] }>('GET', `/bots/music/${id}/commands`)).commands,
  /** eigener Icecast-Server; `password` weglassen = altes behalten */
  setIcecast: (id: number, s: { host: string; port: number; user: string; mount: string; password?: string }) =>
    request<{ stream_url: string }>('PUT', `/bots/music/${id}/icecast`, s),
  /** Lieder für Autoplay (Hochladen in der App noch nicht – bräuchte eine Datei-Auswahl) · 502 */
  autoplayFiles: async (id: number) => (await request<{ files: AutoplayFile[] }>('GET', `/bots/music/${id}/autoplay`)).files,
  removeAutoplayFile: (id: number, name: string) => request<Ok>('DELETE', `/bots/music/${id}/autoplay/${e(name)}`),
};

/** Eigene Radiosender. Nur ansehen, mit Musik-Bot verbinden, abgelaufene löschen. Kein Kaufen/Verlängern. */
export const radio = {
  list: async () => (await request<{ stations: RadioStation[] }>('GET', '/radio')).stations,
  status: (id: number) => request<RadioStatus>('GET', `/radio/${id}/status`),
  sync: (id: number, bot_id: number) => request<Ok>('POST', `/radio/${id}/sync`, { bot_id }),
  /** 409 bundled_station / subscription_active */
  remove: (id: number) => request<Ok>('DELETE', `/radio/${id}`),
};

/** Nachrichten an das Team (Support-Tickets) */
export const support = {
  list: async () => (await request<{ tickets: SupportTicket[] }>('GET', '/me/tickets')).tickets,
  get: (id: number) => request<{ ticket: SupportTicketDetail; replies: SupportReply[] }>('GET', `/me/tickets/${id}`),
  /** 403 limit_reached (höchstens 5 offene) · bot_kind nur welcome/mod */
  create: async (t: { subject: string; body: string; bot_kind?: 'welcome' | 'mod'; bot_id?: number }) =>
    (await request<{ ticket: SupportTicketDetail }>('POST', '/me/tickets', t)).ticket,
  /** 409 ticket_closed */
  reply: (id: number, body: string) => request<{ reply: SupportReply }>('POST', `/me/tickets/${id}/replies`, { body }),
};

/** Hilfe-Chatbot (gleiche KI wie auf der Webseite; gemeinsames Tageslimit) */
export const helpChat = {
  send: (messages: ChatMessage[], lang?: string) =>
    request<{ reply: string; limit_reached: boolean }>('POST', '/chat', { messages, ...(lang ? { lang } : {}) }),
};

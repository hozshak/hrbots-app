// Datentypen der HR-Bots-API v1 (highrise-manager/worker/API.md).
// Genau abgeglichen mit dem Server-Code (worker/src/routes/api_v1.ts: botJson, botSettings und die Antworten der
// einzelnen Handler). Felder, die der Server liefert, die App aber nicht anzeigt, stehen trotzdem hier.

export type BotKind = 'welcome' | 'mod' | 'music';
export const BOT_KINDS: BotKind[] = ['welcome', 'mod', 'music'];

export type BotStatus = 'running' | 'stopped' | 'crashed';

export interface Runtime {
  unlimited: boolean;
  /** ISO-Zeit, bis zu der die aktuell laufende Zeit reicht (nur wenn gerade Zeit läuft) */
  running_until: string | null;
  /** Restzeit inkl. Guthaben in Sekunden; `null` bei unbegrenzter Laufzeit */
  seconds_left: number | null;
}

export interface Bot {
  kind: BotKind;
  id: number;
  name: string;
  room_id: string;
  room_url: string | null;
  status: BotStatus;
  runtime: Runtime;
  /** true, wenn ein Bot-Token hinterlegt ist. Den Token selbst liefert die API nie. */
  bot_token_set: boolean;
  created_at: string | null;
  /** Prozess-Nummer beim Bot-Server, nur wenn er läuft (Webseite: „PID nnn“) */
  pid?: number | null;
  /** nur in der App: Zeitpunkt (ms), zu dem der Stand geholt wurde – für die laufende Restzeit */
  received_at?: number;
}

export interface User {
  id: number;
  username: string;
  discord_linked: boolean;
}

export interface LoginResult {
  token: string;
  expires_at: string | null;
  user: User;
}

export interface Me {
  user: User;
  limits: Record<BotKind, number>;
  counts: Record<BotKind, number>;
}

/** GET /auth/invite/:token (ohne Anmeldung) */
export interface InviteInfo {
  valid: true;
  limits: Record<BotKind, number>;
  /** 1 Begrüßer-Bot gratis (ohne Laufzeit) */
  free_welcome: boolean;
  /** Einladung kam aus Discord → Konto ist sofort mit Discord verbunden */
  discord_linked: boolean;
}
/** POST /auth/register → 201 (wie Login, plus free_welcome) */
export interface RegisterResult extends LoginResult {
  free_welcome: boolean;
}
export interface RegisterInput {
  invite: string;
  username: string;
  password: string;
  accept_terms: true;
}

export type Facing = 'FrontRight' | 'FrontLeft' | 'BackRight' | 'BackLeft';
export const FACINGS: Facing[] = ['FrontRight', 'FrontLeft', 'BackRight', 'BackLeft'];

export interface Position {
  x: number;
  y: number;
  z: number;
  facing: Facing;
}

interface CommonSettings {
  /** immer vorhanden (Standard-Position der Tabelle, wenn nie gesetzt) */
  position: Position;
}

export interface WelcomeMessage {
  id: number;
  message: string;
  target_username: string | null;
  active: boolean;
  /** nur in GET /bots/welcome/:id (Antworten von POST/PATCH …/messages haben es nicht) */
  priority?: number;
}

export interface WelcomeSettings extends CommonSettings, WelcomeExtra {
  messages: WelcomeMessage[];
  admins: string[];
}

/** POST /bots/:kind/:id/position/to_me → Bot läuft zur Highrise-Figur des Besitzers und merkt sich die Stelle.
 *  Fehler: 409 not_running · 409 highrise_not_linked · 404 owner_not_in_room · 409 bot_not_in_room · 504 timeout · 502 agent_error */
export interface PositionToMeResult {
  ok: true;
  position: Position;
}
export type ToMeError = 'not_running' | 'highrise_not_linked' | 'owner_not_in_room' | 'bot_not_in_room' | 'timeout' | 'agent_error';

/** Sinnvolle Grenzen für Koordinaten im Raum (Highrise-Räume beginnen bei 0) – die App prüft vorher */
export const COORD_LIMITS = { xz: { min: 0, max: 200 }, y: { min: 0, max: 100 } } as const;

export type ModRole = 'admin' | 'moderator' | 'vip';
export const MOD_ROLES: ModRole[] = ['admin', 'moderator', 'vip'];
export type BannedAction = 'warn' | 'mute' | 'kick' | 'ban';
export const BANNED_ACTIONS: BannedAction[] = ['warn', 'mute', 'kick', 'ban'];
export type MinRole = 'everyone' | 'vip' | 'moderator' | 'admin';
export const MIN_ROLES: MinRole[] = ['everyone', 'vip', 'moderator', 'admin'];

export interface ModWelcome {
  id: number;
  message: string;
  target_username: string | null;
  active: boolean;
}

export interface BannedWord {
  id: number;
  word: string;
  action: BannedAction;
}

export interface TeleportDestination {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  min_role: MinRole;
}

export interface ModSettings extends CommonSettings, ModExtra {
  /** leerer String, wenn nicht gesetzt */
  owner_username: string;
  roles: Record<ModRole, string[]>;
  banned_words: BannedWord[];
  welcomes: ModWelcome[];
  destinations: TeleportDestination[];
  /** Chat-Befehle für Gehen/Teleport (Standard „!go“ / „!tp“) */
  commands: { go: string; tp: string };
}

export type MusicRole = 'mod' | 'dj' | 'vip';
export const MUSIC_ROLES: MusicRole[] = ['mod', 'dj', 'vip'];
export type MusicAction = 'play' | 'play_top' | 'skip' | 'clearqueue' | 'volup' | 'voldown' | 'autoplay_on' | 'autoplay_off';

export interface MusicSettings extends CommonSettings, MusicExtra {
  /** leerer String, wenn nicht gesetzt */
  owner_username: string;
  roles: Record<MusicRole, string[]>;
  /** gesperrte Nutzer (dürfen sich keine Lieder wünschen) */
  blocked: string[];
  announcements: { lines: string[]; interval_sec: number };
  max_song_minutes: number;
  autoplay: boolean;
  stream_url: string;
  icecast_password_set: boolean;
}

export type BotDetail =
  | { bot: Bot & { kind: 'welcome' }; settings: WelcomeSettings }
  | { bot: Bot & { kind: 'mod' }; settings: ModSettings }
  | { bot: Bot & { kind: 'music' }; settings: MusicSettings };

export interface CreateBotInput {
  kind: BotKind;
  name: string;
  room: string;
  bot_token: string;
  welcome_messages?: string[];
  owner_username?: string;
}

export interface UpdateBotInput {
  /** Bot-Programm (Webseite „Runtime“); wirkt nach Stop + Start */
  engine?: BotEngine;
  /** nur mod/music; "" = keiner */
  owner_username?: string;
  name?: string;
  room?: string;
  bot_token?: string;
  position?: Position;
}

export interface UpdateBotResult {
  bot: Bot;
  /** true, wenn der laufende Bot wegen neuem Raum/Token neu gestartet wurde */
  restarted: boolean;
}

export type PowerAction = 'start' | 'stop' | 'restart';

export interface ActionResult {
  ok: true;
  status_hint: 'starting' | 'stopping' | 'restarting';
  message_key: 'bot_started' | 'bot_stopped' | 'bot_restarted';
}

export interface PresenceEvent {
  event: string;
  username: string;
  created_at: string;
}

export interface Ok {
  ok: true;
}

// ---- Antworten der Einstellungs-Endpunkte ----
export type MessageResult = { message: Omit<WelcomeMessage, 'priority'> };
export type AdminResult = Ok & { username: string };
export type RoleResult<R extends string> = Ok & { role: R; users: string[] };
export type BannedWordResult = Ok & { word: string; action: BannedAction };
export type ModWelcomeResult = { welcome: ModWelcome };
export type DestinationResult = { destination: TeleportDestination };
export type AnnouncementsResult = { announcements: { lines: string[]; interval_sec: number } };
export type MusicSettingsResult = { max_song_minutes: number; autoplay: boolean };
export type CommandResult = Ok & { cmd_id: number };

// Grenzen wie auf dem Server (api_v1.ts) – die App prüft vorher, damit keine 400 invalid_input kommt.
export const INPUT_LIMITS = {
  name: 40,
  message: 300,
  username: 40,
  word: 40,
  destName: 40,
  botToken: 200,
  announceLines: 20,
  announceLine: 300,
  intervalMin: 30,
  intervalMax: 3600,
  songMin: 1,
  songMax: 1440,
  query: 200,
} as const;

// =====================================================================================================================
// Erweiterungen (alle Webseiten-Funktionen außer Kaufen/Mieten). Formen genau nach API.md (Stand 23.11.2026).
// Gold-Preise, die der Server mitliefert (mod `vip.price`, music `gold_per_ticket`), zeigt die App bewusst NICHT an.
// Das Gold *des Bots* (`wallet`) wird nur angezeigt (Aktivität), nichts davon lässt sich in der App ausgeben.
// =====================================================================================================================

/** Bot-Programm (Webseite: „Runtime“ js|python). In der App nur unter „Experten-Einstellungen“ als „Bot-Motor“. */
export type BotEngine = 'js' | 'python';

/** Welcome: „Beobachten“ (position_tracking) – der Bot flüstert den Helfern, wo die Person ist. */
export interface TrackedUser {
  id: number;
  username: string;
  active: boolean;
}

export interface ModWarn { username: string; count: number }
export interface ModMute { id: number; username: string; muted_by: string | null; created_at: string | null }
/** `reason` ist beim Server "" wenn leer */
export interface ModReport { id: number; reporter: string; reported: string; reason: string | null; status: 'open' | 'closed'; created_at: string | null }
export interface ModLogEntry { id: number; action: string; target: string | null; done_by: string | null; reason: string | null; created_at: string | null }
/** Gold, das der Bot selbst im Raum hat (Trinkgeld der Gäste) – nur Anzeige, nichts zum Ausgeben */
export interface BotWallet { gold: number | null; updated_at: string | null }
export interface ModGuest { username: string; first_seen: string | null }
/** VIP-Bereich wie gespeichert (Quadrat x1/z1–x2/z2) */
export interface VipZone { id: number; name: string; x1: number; z1: number; x2: number; z2: number }
export interface OutfitItem { id: string; palette: number }
export interface ModOutfit { id: number; name: string; items: OutfitItem[] }

export interface ModModeration {
  mutes: ModMute[];
  warns: ModWarn[];
  bans_count: number;
  reports: ModReport[];
  logs: ModLogEntry[];
}

export interface WelcomeExtra {
  engine?: BotEngine;
  tracking?: TrackedUser[];
  /** Gold des Begrüßers im Raum – nur Anzeige; `null`, bis der Bot es einmal gemeldet hat */
  wallet?: BotWallet | null;
}
export interface ModExtra {
  engine?: BotEngine;
  moderation?: ModModeration;
  /** Mod-Beobachten: nur Namen */
  tracking?: string[];
  guests?: ModGuest[];
  /** `price` (Gold) wird NICHT angezeigt */
  vip?: { price?: number; safe_spot: { x: number; y: number; z: number } | null; zones: VipZone[] };
  outfits?: { rotate: boolean; interval_minutes: number; list: ModOutfit[] };
  /** Gold des Bots im Raum (per !wallet aktualisiert) – nur Anzeige */
  wallet?: BotWallet | null;
}
export interface MusicTicket { username: string; tickets: number }
export interface MusicExtra {
  engine?: BotEngine;
  /** beim echten Server immer ein Objekt */
  icecast?: { host: string; port: number; user: string; mount: string; password_set: boolean } | null;
  tickets?: MusicTicket[];
  /** Gold des DJ-Bots im Raum (per -musicwallet aktualisiert) – nur Anzeige */
  wallet?: BotWallet | null;
}

export interface MusicRecentCommand {
  id: number;
  action: string;
  args: { query?: string } | null;
  requested_by: string | null;
  status: 'pending' | 'processing' | 'done' | 'error' | string;
  result: string | null;
  created_at: string | null;
  executed_at?: string | null;
}
export interface AutoplayFile { name: string; size: number }
export interface AutoplayList { files: AutoplayFile[]; max_files: number; max_bytes: number }

/** GET /radio – eigene Radiosender (ohne Preise; Kaufen/Verlängern gibt es in der App nicht) */
export interface RadioStation {
  id: number;
  name: string;
  mount: string;
  stream_url: string;
  source: { host: string; port: number; mount: string; user: string; password_set: boolean };
  /** inklusive Station eines Music-Bots */
  bundled_bot_id: number | null;
  last_synced_bot_id: number | null;
  active: boolean;
  unlimited: boolean;
  expires_at: string | null;
  deletable: boolean;
  created_at: string | null;
  status?: RadioStatus;
}
export interface RadioStatus { live: boolean; listeners: number | null }

export type TicketStatus = 'open' | 'answered' | 'closed';
export interface SupportTicket {
  id: number;
  subject: string;
  status: TicketStatus;
  created_at: string | null;
  updated_at: string | null;
}
export interface SupportReply { id?: number; author: 'user' | 'admin'; author_name: string | null; body: string; image?: string | null; created_at: string | null }
export interface SupportTicketDetail extends SupportTicket {
  body: string;
  bot: { kind: BotKind; id: number; name: string } | null;
  image?: string | null;
}

/** Highrise-Konto verknüpfen (Code aus dem Bank-Raum) */
export interface HighriseLink { linked: boolean; highrise_username: string | null }
export interface DiscordInfo { linked: boolean; discord_username: string | null; required: boolean; verify_url: string; invite_url: string | null }
/** POST /me/discord/web_link: Einmal-Link (5 min), öffnet im Browser ohne neues Anmelden die Discord-Seite */
export interface DiscordWebLink { url: string; expires_at: string | null }

/** GET /me/wallet – nur ansehen (kein Kaufen/Mieten in der App) */
export interface WalletTx { amount: number; reason: string; created_at: string | null }
export interface Wallet {
  gold_balance: number;
  highrise_linked: boolean;
  highrise_username: string | null;
  transactions: WalletTx[];
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export const EXTRA_LIMITS = {
  ticketSubject: 200,
  ticketBodyMin: 10,
  ticketBody: 4000,
  replyMin: 2,
  passwordMin: 4,
  passwordMax: 200,
  linkCode: 6,
  outfitName: 40,
  outfitItems: 50,
  cmdWord: 20,
  maxOpenTickets: 5,
  chatMessage: 2000,
  outfitItemLen: 100,
  /** Bild als Data-URL (Tickets, Chat): höchstens so viele Zeichen */
  imageChars: 800000,
  autoplayFiles: 20,
  autoplayBytes: 10 * 1024 * 1024,
  newUserMin: 2,
  newUserMax: 32,
} as const;

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

export interface WelcomeSettings extends CommonSettings {
  messages: WelcomeMessage[];
  admins: string[];
}

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

export interface ModSettings extends CommonSettings {
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

export interface MusicSettings extends CommonSettings {
  /** leerer String, wenn nicht gesetzt */
  owner_username: string;
  roles: Record<MusicRole, string[]>;
  /** gesperrte Nutzer (nur lesen; Bearbeiten gibt es nur auf der Webseite) */
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

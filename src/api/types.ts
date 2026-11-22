// Datentypen der HR-Bots-API v1 (highrise-manager/worker/API.md).
// Die Form von `settings` je Bot-Art steht in API.md nur als Liste der Endpunkte; die Felder hier sind aus den
// Tabellen/Handlern der Webseite abgeleitet (IMPL_NOTES.md) und müssen beim Bau der API genau so geliefert werden.

export type BotKind = 'welcome' | 'mod' | 'music';
export const BOT_KINDS: BotKind[] = ['welcome', 'mod', 'music'];

export type BotStatus = 'running' | 'stopped' | 'crashed';

export interface Runtime {
  unlimited: boolean;
  running_until: string | null;
  seconds_left: number;
}

export interface Bot {
  kind: BotKind;
  id: number;
  name: string;
  room_id: string;
  room_url: string | null;
  status: BotStatus;
  runtime: Runtime;
  created_at: string;
  /** nur in der App: Zeitpunkt (ms), zu dem der Stand geholt wurde – für die laufende Restzeit */
  received_at?: number;
}

export interface User {
  id: number;
  username: string;
  discord_linked: boolean;
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
  /** true, wenn ein Bot-Token hinterlegt ist. Den Token selbst liefert die API nie. */
  bot_token_set: boolean;
  position: Position | null;
}

export interface WelcomeMessage {
  id: number;
  message: string;
  target_username: string | null;
  active: boolean;
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
  owner_username: string | null;
  roles: Record<ModRole, string[]>;
  banned_words: { word: string; action: BannedAction }[];
  welcomes: ModWelcome[];
  destinations: TeleportDestination[];
}

export type MusicRole = 'mod' | 'dj' | 'vip';
export const MUSIC_ROLES: MusicRole[] = ['mod', 'dj', 'vip'];
export type MusicAction = 'play' | 'play_top' | 'skip' | 'clearqueue' | 'volup' | 'voldown' | 'autoplay_on' | 'autoplay_off';

export interface MusicSettings extends CommonSettings {
  roles: Record<MusicRole, string[]>;
  announcements: { lines: string[]; interval_sec: number };
  max_song_minutes: number;
  autoplay: boolean;
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

export type PowerAction = 'start' | 'stop' | 'restart';

export interface ActionResult {
  ok: boolean;
  status_hint?: string;
  message_key?: string;
}

export interface PresenceEvent {
  event: string;
  username: string;
  created_at: string;
}

export interface Ok {
  ok: true;
}

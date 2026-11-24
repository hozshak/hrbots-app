// Test-Server im Speicher (EXPO_PUBLIC_API_MOCK=1): spielt die API v1 nach, damit die App ohne highrise-bots.com
// ganz durchgetestet werden kann. Stand geht beim Neuladen verloren.
// Antwort-Formen, Fehler-Codes und Prüfungen genau wie worker/src/routes/api_v1.ts (botJson, botSettings, Handler).
//
// Besondere Testfälle:
//   Passwort „wrong“                → 401 invalid_credentials (Anmelden, Konto löschen)
//   Benutzername „nodiscord“        → Konto ohne Discord → 403 discord_required für alle Bot-Aufrufe
//   Benutzername „disabled“         → 403 account_disabled
//   Bot „Party Welcome“             → keine Laufzeit → 402 no_runtime beim Start
//   Bot „Chill Radio“               → 1. Start: 502 agent_unreachable, 2. Start: stürzt ab (Beheben-Blatt), 3. klappt
//   Raum-ID 000000000000000000000000 → 400 invalid_room
//   Neu angelegte Bots bekommen im Mock 1 Stunde Laufzeit (echter Server: 0, außer Gratis-Bot), damit Start testbar ist.
//   Einladungen: DEMO-INVITE-1234 (1/1/1 + Gratis-Begrüßer, ohne Discord), DISCORD-INVITE-1234 (mit Discord); einmal benutzbar.
//   Neu registrierte Konten haben kein Discord, bis „Discord verbinden“ (POST /me/discord/web_link) getippt wurde.
//   Autoplay-Upload: der Mock bekommt nur Name/Größe ({__file}); > 10 MB / kein .mp3 / 20 Lieder → Fehler wie der Server.
//   Highrise-Konto: alle Testnamen sind verbunden (als eigener Name), außer „nolink“ und in der App registrierte Konten
//     → dort Code ABC234 = klappt, USED00 = schon benutzt, TAKEN0 = anderes Konto.
//   „Bot zu mir holen“ (POST …/position/to_me): Bot aus → 409 not_running · ohne Highrise → 409 highrise_not_linked ·
//     „Club Guard“ 1. Versuch → 404 owner_not_in_room · „Chill Radio“ 1. → 409 bot_not_in_room, 2. → 504 timeout · sonst klappt es.
//   Gold des Bots: „Lobby Greeter“ 6, „Club Guard“ 42, „Party Welcome“ wallet null, „Chill Radio“ noch unbekannt (gold null).
import { ApiError, type Handler, type Method } from './transport';
import type {
  BannedAction, Bot, BotKind, BotStatus, Facing, MinRole, ModSettings, MusicSettings, Position, WelcomeSettings,
  MusicRecentCommand, AutoplayFile, RadioStation, SupportTicketDetail, SupportReply, Wallet, VipZone,
} from './types';
import { FACINGS, INPUT_LIMITS as L } from './types';

type AnySettings = WelcomeSettings | ModSettings | MusicSettings;
type MockBot = Bot & {
  settings: AnySettings;
  /** Zustand, den der „Agent“ nach kurzer Zeit meldet */
  pending?: { status: BotStatus; at: number };
  /** Zeitpunkt (ms), seit dem der Bot Laufzeit verbraucht */
  runningSince?: number;
  agentDownOnce?: boolean;
  /** nächster Start stürzt ab (z. B. fehlende Designer-Rechte) */
  crashOnce?: boolean;
  /** Testfälle für „Bot zu mir holen“: diese Fehler kommen der Reihe nach, danach klappt es */
  toMeFails?: { status: number; code: string; message: string }[];
  logs: string[];
  /** Teile, die nicht in GET /bots/:kind/:id stecken */
  recent?: MusicRecentCommand[];
  autoplay?: AutoplayFile[];
};

const now = () => Date.now();
/** ISO ohne Millisekunden – wie der Server (dbTimeIso) */
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const ago = (min: number) => iso(now() - min * 60000);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(status, code, message);
};

let nextId = 20;
let nextSub = 100;
const pos = (x: number, y: number, z: number, facing: Facing = 'FrontRight'): Position => ({ x, y, z, facing });
/** Standard-Positionen der Tabellen (bots/mod_bots: 6,0,6 · music_bots: 14.5,9.25,3.5) */
const defaultPos = (kind: BotKind) => (kind === 'music' ? pos(14.5, 9.25, 3.5) : pos(6, 0, 6));

function logLines(name: string): string[] {
  const t = (m: number) => new Date(now() - m * 60000).toISOString().replace('T', ' ').slice(0, 19);
  return [
    `${t(42)} INFO  Starting ${name}`,
    `${t(42)} INFO  Connected to room`,
    `${t(41)} INFO  Walked to position`,
    `${t(30)} INFO  Greeted @mila_x`,
    `${t(22)} WARNING Rate limit close – slowing down chat messages`,
    `${t(18)} INFO  Greeted @dj.nova`,
    `${t(9)} ERROR Highrise websocket closed (1006), reconnecting`,
    `${t(9)} INFO  Reconnected`,
    `${t(2)} INFO  Heartbeat ok`,
  ];
}

const db: {
  bots: MockBot[]; deletedUsers: Set<string>; presence: Record<string, { event: string; username: string; created_at: string }[]>;
  /** im „Browser“ mit Discord verbunden (nach POST /me/discord/web_link) */
  discordLinked: Set<string>;
  /** in der App registrierte Namen (klein) */
  registered: Set<string>;
  /** Einladungen: Code → Kontingent; benutzt = gelöscht */
  invites: Record<string, { limits: Record<BotKind, number>; free_welcome: boolean; discord: boolean }>;
} = {
  deletedUsers: new Set(),
  presence: {},
  discordLinked: new Set(),
  registered: new Set(),
  invites: {
    'DEMO-INVITE-1234': { limits: { welcome: 1, mod: 1, music: 1 }, free_welcome: true, discord: false },
    'DISCORD-INVITE-1234': { limits: { welcome: 2, mod: 1, music: 0 }, free_welcome: false, discord: true },
  },
  bots: [
    {
      kind: 'welcome', id: 4, name: 'Lobby Greeter', room_id: '64f1a2b3c4d5e6f708192a3b',
      room_url: 'https://high.rs/room?id=64f1a2b3c4d5e6f708192a3b', status: 'running', bot_token_set: true,
      runtime: { unlimited: false, running_until: null, seconds_left: 2 * 3600 + 13 * 60 + 40 },
      created_at: '2026-03-04T12:38:47Z', runningSince: now(), logs: logLines('Lobby Greeter'),
      settings: {
        position: pos(14.5, 0.25, 9, 'FrontLeft'),
        messages: [
          { id: 14, message: 'Welcome to the room, {username} ❤️', target_username: null, active: true, priority: 0 },
          { id: 15, message: 'Great to see you today, {username} 🤍', target_username: null, active: true, priority: 0 },
          { id: 16, message: 'The boss is here! Hi {username} 👑', target_username: 'bbos', active: false, priority: 0 },
        ],
        admins: ['bbos'],
        tracking: [{ id: 61, username: 'k1ra', active: true }],
        engine: 'js',
        wallet: { gold: 6, updated_at: ago(3) },
      } as WelcomeSettings,
    },
    {
      kind: 'mod', id: 3, name: 'Club Guard', room_id: '6512aa0b9c8d7e6f5a4b3c2d',
      room_url: 'https://highrise.game/en/room?id=6512aa0b9c8d7e6f5a4b3c2d', status: 'stopped', bot_token_set: true,
      runtime: { unlimited: true, running_until: null, seconds_left: null },
      created_at: '2026-03-13T21:20:00Z', logs: logLines('Club Guard'),
      toMeFails: [{ status: 404, code: 'owner_not_in_room', message: 'Owner is not in the room' }],
      settings: {
        position: pos(10, 0, 10), owner_username: 'bbos',
        roles: { admin: ['bbos'], moderator: ['mila_x', 'k1ra'], vip: ['dj.nova'] },
        banned_words: [{ id: 1, word: 'hack', action: 'ban' }, { id: 2, word: 'scam', action: 'kick' }, { id: 3, word: 'spam', action: 'warn' }],
        welcomes: [{ id: 31, message: 'Welcome {username}! Type !rules for the rules.', target_username: null, active: true }],
        destinations: [
          { id: 5, name: 'dj', x: 14.5, y: 15.5, z: 17, min_role: 'everyone' },
          { id: 4, name: 'mod', x: 13.5, y: 15.5, z: 24, min_role: 'moderator' },
          { id: 3, name: 'vip', x: 14.5, y: 8.5, z: 28.5, min_role: 'vip' },
        ],
        commands: { go: '!go', tp: '!tp' },
        engine: 'js',
        wallet: { gold: 42, updated_at: ago(60) },
        moderation: {
          mutes: [{ id: 1, username: 'spammer99', muted_by: 'mila_x', created_at: ago(35) }],
          warns: [{ username: 'lunaa', count: 2 }, { username: 'ghost_rider', count: 1 }],
          bans_count: 1,
          reports: [
            { id: 1, reporter: 'k1ra', reported: 'spammer99', reason: 'Spam in chat', status: 'open', created_at: ago(50) },
            { id: 2, reporter: 'beatz', reported: 'lunaa', reason: 'Rude words', status: 'closed', created_at: ago(60 * 26) },
          ],
          logs: [
            { id: 3, action: 'mute', target: 'spammer99', done_by: 'mila_x', reason: 'spam', created_at: ago(35) },
            { id: 2, action: 'warn', target: 'lunaa', done_by: 'bot', reason: 'word: spam', created_at: ago(80) },
            { id: 1, action: 'kick', target: 'troll_22', done_by: 'bbos', reason: null, created_at: ago(60 * 5) },
          ],
        },
        tracking: ['ghost_rider'],
        guests: [{ username: 'mila_x', first_seen: ago(60 * 48) }, { username: 'beatz', first_seen: ago(60 * 20) }],
        vip: { price: 0, safe_spot: { x: 10, y: 0, z: 10 }, zones: [{ id: 81, name: 'vip lounge', x1: 11.5, z1: 25.5, x2: 17.5, z2: 31.5 }] },
        outfits: {
          rotate: true, interval_minutes: 10,
          list: [
            { id: 91, name: 'Party', items: [{ id: 'shirt-f_punklace', palette: -1 }, { id: 'pants-n_jeans', palette: -1 }, { id: 'shoes-n_sneakers', palette: -1 }, { id: 'hair_front-n_short', palette: 2 }] },
            { id: 92, name: 'Guard', items: [{ id: 'shirt-n_uniform', palette: -1 }, { id: 'pants-n_cargo', palette: -1 }, { id: 'hat-n_cap', palette: -1 }] },
          ],
        },
      } as ModSettings,
    },
    {
      kind: 'music', id: 7, name: 'Chill Radio', room_id: '65aa77bb88cc99dd00ee11ff',
      room_url: 'https://high.rs/room?id=65aa77bb88cc99dd00ee11ff', status: 'crashed', bot_token_set: true,
      runtime: { unlimited: false, running_until: null, seconds_left: 45 * 60 },
      created_at: '2026-06-01T18:00:00Z', agentDownOnce: true, crashOnce: true,
      toMeFails: [{ status: 409, code: 'bot_not_in_room', message: 'Bot is not in the room' }, { status: 504, code: 'timeout', message: 'Bot did not answer in time' }],
      logs: [...logLines('Chill Radio'), `${iso(now() - 60000).replace('T', ' ').slice(0, 19)} ERROR Stream encoder exited with code 1`],
      settings: {
        position: defaultPos('music'), owner_username: '',
        roles: { mod: ['mila_x'], dj: ['dj.nova', 'beatz'], vip: [] },
        blocked: [],
        announcements: { lines: ['🎶 Wish for a song with -play <song name>', '⏭️ DJs can skip with -skip'], interval_sec: 600 },
        max_song_minutes: 8, autoplay: true,
        stream_url: 'https://radio.highrise-bots.com/mount_1a2b3c4d', icecast_password_set: true,
        icecast: { host: 'radio.highrise-bots.com', port: 8000, user: 'source', mount: 'mount_1a2b3c4d', password_set: true },
        engine: 'python',
        gold_per_ticket: 3.3,
        tickets: [{ username: 'dj.nova', tickets: 5 }, { username: 'mila_x', tickets: 2 }],
        wallet: { gold: null, updated_at: null },
      } as MusicSettings,
      recent: [
        { id: 3, action: 'play', args: { query: 'lofi beats' }, requested_by: 'app', status: 'done', result: 'Added to queue', created_at: ago(12), executed_at: ago(12) },
        { id: 2, action: 'skip', args: {}, requested_by: 'dj.nova', status: 'done', result: null, created_at: ago(20), executed_at: ago(20) },
        { id: 1, action: 'volup', args: {}, requested_by: 'app', status: 'error', result: 'Bot offline', created_at: ago(60 * 3), executed_at: null },
      ],
      autoplay: [{ name: 'chill-intro.mp3', size: 3_400_000 }, { name: 'night-drive.mp3', size: 5_100_000 }],
    },
    {
      kind: 'welcome', id: 9, name: 'Party Welcome', room_id: '66bb00112233445566778899',
      room_url: null, status: 'stopped', bot_token_set: true,
      runtime: { unlimited: false, running_until: null, seconds_left: 0 },
      created_at: '2026-10-02T09:10:00Z', logs: [],
      settings: {
        position: defaultPos('welcome'),
        messages: [
          { id: 40, message: 'Hey {username}, the party is on! 🎉', target_username: null, active: true, priority: 0 },
          { id: 41, message: 'Welcome {username}, grab a drink 🍹', target_username: null, active: true, priority: 0 },
        ],
        admins: [],
        tracking: [],
        engine: 'js',
        wallet: null,
      } as WelcomeSettings,
    },
  ],
};

// ---- Konto-Teile ----
const acct = {
  password: 'demo',
  /** Highrise-Verknüpfung je Konto (klein geschrieben): Name = verbunden, null = nicht verbunden, fehlt = Standard */
  highrise: {} as Record<string, string | null>,
  wallet: {
    gold_balance: 302,
    transactions: [
      { amount: 10, reason: 'tip', created_at: ago(60 * 3) },
      { amount: -200, reason: 'subscription', created_at: ago(60 * 30) },
      { amount: 500, reason: 'admin_grant', created_at: ago(60 * 24 * 4) },
      { amount: 2, reason: 'tip', created_at: ago(60 * 24 * 5) },
    ],
  },
  radios: [
    {
      id: 1, name: 'Chill Radio', mount: 'mount_1a2b3c4d', stream_url: 'https://stream.highrise-bots.com/mount_1a2b3c4d',
      source: { host: 'radio.highrise-bots.com', port: 8000, mount: 'mount_1a2b3c4d', user: 'source', password_set: true },
      bundled_bot_id: 7, last_synced_bot_id: 7, active: true, unlimited: true, expires_at: null, deletable: false, created_at: '2026-06-01T18:00:00Z',
    },
    {
      id: 2, name: 'Old Station', mount: 'mount_9f8e7d6c', stream_url: 'https://stream.highrise-bots.com/mount_9f8e7d6c',
      source: { host: 'radio.highrise-bots.com', port: 8000, mount: 'mount_9f8e7d6c', user: 'source', password_set: true },
      bundled_bot_id: null, last_synced_bot_id: null, active: false, unlimited: false, expires_at: iso(now() - 3 * 86400_000), deletable: true, created_at: '2026-08-01T10:00:00Z',
    },
  ] as RadioStation[],
  tickets: [
    {
      id: 12, subject: 'My bot does not join', status: 'answered', created_at: ago(60 * 30), updated_at: ago(60 * 2),
      body: 'Hi, my greeter bot does not come into my room.', bot: { kind: 'welcome', id: 4, name: 'Lobby Greeter' }, image: null,
    },
  ] as SupportTicketDetail[],
  replies: {
    // Admin-Antwort mit Bild (wie ein Screenshot vom Team) – zeigt die Bild-Anzeige im Verlauf
    12: [{ id: 1, author: 'admin', author_name: 'Team', body: 'Hi! Please give the bot Designer rights in your room, then turn it on again.', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', created_at: ago(60 * 2) }],
  } as Record<number, SupportReply[]>,
};
let nextTicket = 13;

// ---- Laufzeit / Status wie der Agent: Status ändert sich erst nach kurzer Zeit ----
function tick(b: MockBot) {
  if (b.pending && now() >= b.pending.at) {
    b.status = b.pending.status;
    b.pending = undefined;
  }
  const rt = b.runtime;
  if (rt.unlimited) {
    rt.seconds_left = null;
    rt.running_until = null;
    return;
  }
  if (b.status === 'running' && b.runningSince) {
    const used = Math.floor((now() - b.runningSince) / 1000);
    rt.seconds_left = Math.max(0, (rt.seconds_left ?? 0) - used);
    b.runningSince = now();
    if (rt.seconds_left === 0) {
      b.status = 'stopped';
      b.runningSince = undefined;
    }
  }
  rt.running_until = b.status === 'running' && b.runningSince ? iso(now() + (rt.seconds_left ?? 0) * 1000) : null;
}

/** wie botJson() auf dem Server */
function publicBot(b: MockBot): Bot {
  tick(b);
  return {
    kind: b.kind, id: b.id, name: b.name, room_id: b.room_id, room_url: b.room_url ?? null, status: b.status,
    runtime: { ...b.runtime }, bot_token_set: b.bot_token_set, created_at: b.created_at,
    pid: b.status === 'running' ? 170800 + b.id : null,
  };
}

function presenceFor(b: MockBot) {
  const key = `${b.kind}:${b.id}`;
  if (!db.presence[key]) {
    const names = ['mila_x', 'dj.nova', 'k1ra', 'beatz', 'lunaa', 'bbos', 'ghost_rider'];
    db.presence[key] = b.logs.length
      ? names.flatMap((n, i) => [
          { event: 'join', username: n, created_at: ago(5 + i * 11) },
          ...(i % 2 ? [{ event: 'leave', username: n, created_at: ago(2 + i * 9) }] : []),
        ]).sort((a, c) => c.created_at.localeCompare(a.created_at)).slice(0, 50)
      : [];
  }
  return db.presence[key];
}

/** Testnamen ohne Discord: „nodiscord“ und alle in der App registrierten (bis „im Browser verbunden“) */
const hasDiscord = (username: string) => {
  const u = username.toLowerCase();
  return db.discordLinked.has(u) || (u !== 'nodiscord' && !db.registered.has(u));
};
/** Highrise-Verknüpfung: Testnamen sind verbunden (eigener Name), außer „nolink“ und in der App registrierte Konten */
function hrLink(username: string): { linked: boolean; highrise_username: string | null } {
  const u = username.toLowerCase();
  const v = u in acct.highrise ? acct.highrise[u] : u === 'nolink' || db.registered.has(u) ? null : u;
  return { linked: !!v, highrise_username: v ?? null };
}
function userFromToken(token: string | null) {
  if (!token || !token.startsWith('mock-')) fail(401, 'unauthorized', 'Missing or invalid bearer token');
  const username = decodeURIComponent(token!.slice(5));
  if (db.deletedUsers.has(username.toLowerCase())) fail(401, 'unauthorized', 'Missing or invalid bearer token');
  return { id: 1, username, discord_linked: hasDiscord(username), link_provider: 'tolobby' as const };
}

const BOT_LIMITS: Record<BotKind, number> = { welcome: 3, mod: 2, music: 2 };
const counts = () =>
  ({
    welcome: db.bots.filter((b) => b.kind === 'welcome').length,
    mod: db.bots.filter((b) => b.kind === 'mod').length,
    music: db.bots.filter((b) => b.kind === 'music').length,
  }) as Record<BotKind, number>;

function findBot(kind: string, id: string) {
  const b = db.bots.find((x) => x.kind === kind && String(x.id) === id);
  if (!b) fail(404, 'not_found', 'Bot not found');
  return b!;
}
const ws = (b: MockBot) => b.settings as WelcomeSettings;
const ms = (b: MockBot) => b.settings as ModSettings;
const mus = (b: MockBot) => b.settings as MusicSettings;

// ---- Eingabe-Prüfung wie api_v1.ts ----
type Body = Record<string, any>;
function optStr(b: Body, key: string, max: number): string | undefined {
  const v = b[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') fail(400, 'invalid_input', `${key} must be a string`);
  const s = v.trim();
  if (s.length > max) fail(400, 'invalid_input', `${key} must be at most ${max} characters`);
  return s;
}
function reqStr(b: Body, key: string, max: number, missingCode = 'invalid_input'): string {
  const s = optStr(b, key, max);
  if (!s) fail(400, missingCode, `${key} is required`);
  return s!;
}
function normUsername(v: unknown, key = 'username'): string {
  if (typeof v !== 'string') fail(400, 'invalid_input', `${key} must be a string`);
  const u = (v as string).trim().toLowerCase().replace(/^@/, '');
  if (!/^[a-z0-9._-]{1,40}$/.test(u)) fail(400, 'invalid_input', `${key} must be 1-40 characters [a-z0-9._-]`);
  return u;
}
function optUsername(b: Body, key: string): string | null {
  const v = b[key];
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return null;
  return normUsername(v, key);
}
function finiteNum(v: unknown, key: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(400, 'invalid_input', `${key} must be a finite number`);
  return v as number;
}
function intInRange(v: unknown, key: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) fail(400, 'invalid_input', `${key} must be an integer between ${min} and ${max}`);
  return v as number;
}
const message = (b: Body) => reqStr(b, 'message', L.message);

/** wie parseRoomInput() auf dem Server: 24-Hex oder high.rs/highrise.game-Link mit ?id= / ownedRoomId= / /room/<id> */
function parseRoomInput(input: string): { room_id: string; room_url: string | null } | null {
  const val = input.trim();
  if (!val) return null;
  if (/^[a-f0-9]{24}$/i.test(val)) return { room_id: val, room_url: null };
  if (val.includes('high.rs') || val.includes('highrise.game')) {
    const m = val.match(/[?&]ownedRoomId=([a-f0-9]{24})/i) || val.match(/[?&]id=([a-f0-9]{24})/i) || val.match(/\/rooms?\/([a-f0-9]{24})(?![a-f0-9])/i);
    if (m) return { room_id: m[1], room_url: val };
  }
  return null;
}
function roomOf(input: string) {
  const r = parseRoomInput(input);
  if (!r || r.room_id === '000000000000000000000000') fail(400, 'invalid_room', 'room must be a Highrise room link or a 24-character hex room ID');
  return r!;
}

function addLog(b: MockBot, level: 'INFO' | 'WARNING' | 'ERROR', text: string) {
  b.logs.push(`${new Date().toISOString().replace('T', ' ').slice(0, 19)} ${level.padEnd(5)} ${text}`);
}

const RESULT = {
  start: { ok: true, status_hint: 'starting', message_key: 'bot_started' },
  stop: { ok: true, status_hint: 'stopping', message_key: 'bot_stopped' },
  restart: { ok: true, status_hint: 'restarting', message_key: 'bot_restarted' },
} as const;

function power(b: MockBot, action: 'start' | 'stop' | 'restart') {
  tick(b);
  // nur Start prüft/verbraucht Laufzeit (consumeCreditOnStart); Stop/Restart gehen immer an den Agent
  if (action === 'start' && !b.runtime.unlimited && (b.runtime.seconds_left ?? 0) <= 0) fail(402, 'no_runtime', 'No runtime left');
  if (b.agentDownOnce) {
    b.agentDownOnce = false;
    fail(502, 'agent_unreachable', 'Agent unreachable');
  }
  if (action === 'stop') {
    addLog(b, 'INFO', 'Stop requested');
    b.pending = { status: 'stopped', at: now() + 1500 };
    b.runningSince = undefined;
    return RESULT.stop;
  }
  addLog(b, 'INFO', action === 'restart' ? 'Restart requested' : 'Start requested');
  if (b.crashOnce) {
    b.crashOnce = false;
    b.pending = { status: 'crashed', at: now() + 2500 };
    setTimeout(() => addLog(b, 'ERROR', 'Cannot enter room: bot has no designer rights'), 2500);
    return RESULT[action];
  }
  if (action === 'restart') b.status = 'stopped';
  b.pending = { status: 'running', at: now() + (action === 'restart' ? 3500 : 2500) };
  b.runningSince = now();
  setTimeout(() => addLog(b, 'INFO', 'Connected to room'), action === 'restart' ? 3500 : 2500);
  return RESULT[action];
}

function botSettingsFor(kind: BotKind, owner: string, msgs: string[]): AnySettings {
  const position = defaultPos(kind);
  if (kind === 'welcome') {
    return { position, engine: 'js', messages: msgs.map((m) => ({ id: nextSub++, message: m, target_username: null, active: true, priority: 0 })), admins: [], tracking: [], wallet: { gold: null, updated_at: null } };
  }
  if (kind === 'mod') {
    return {
      position, engine: 'js', owner_username: owner, roles: { admin: [], moderator: [], vip: [] }, banned_words: [], welcomes: [], destinations: [], commands: { go: '!go', tp: '!tp' },
      moderation: { mutes: [], warns: [], bans_count: 0, reports: [], logs: [] }, tracking: [], guests: [], vip: { price: 0, safe_spot: null, zones: [] },
      outfits: { rotate: false, interval_minutes: 10, list: [] }, wallet: { gold: null, updated_at: null },
    };
  }
  // wie der Server: jeder neue DJ bekommt ein inklusives Radio (radio.highrise-bots.com, Hörer-Link stream.…)
  const mount = `mount_${Math.random().toString(16).slice(2, 10)}`;
  return {
    position, engine: 'js', owner_username: owner, roles: { mod: [], dj: [], vip: [] }, blocked: [], tickets: [],
    announcements: { lines: [], interval_sec: 300 }, max_song_minutes: 120, autoplay: false,
    stream_url: `https://stream.highrise-bots.com/${mount}`, icecast_password_set: true,
    icecast: { host: 'radio.highrise-bots.com', port: 8000, user: 'source', mount, password_set: true },
    gold_per_ticket: 3.3, wallet: { gold: null, updated_at: null },
  } as MusicSettings;
}

/** „läuft gerade?“ wie die Icecast-Statistik: live, wenn der verbundene DJ läuft */
function radioStatus(st: RadioStation) {
  const live = st.active && db.bots.some((b) => b.kind === 'music' && b.id === st.last_synced_bot_id && b.status === 'running');
  return { live, listeners: live ? 3 : null };
}

/** Bild wie optImage() auf dem Server: Data-URL png/jpeg/gif/webp, ≤ 800 000 Zeichen */
function optImage(body: Body): string | null {
  const v = body.image;
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') fail(400, 'invalid_input', 'image must be a string');
  if (v.length > 800000) fail(400, 'invalid_input', 'image too large (max 500 KB)');
  if (!/^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=\s]+$/.test(v)) fail(400, 'invalid_input', 'image must be a base64 data URL (png, jpeg, gif, webp)');
  return v;
}

/** inklusives Radio zu einem neuen DJ-Bot (wie api_v1.ts POST /bots, kind music) */
function bundledRadio(b: MockBot) {
  const ic = mus(b).icecast!;
  acct.radios.unshift({
    id: nextSub++, name: `🎙️ ${b.name}`, mount: ic.mount, stream_url: mus(b).stream_url,
    source: { host: ic.host, port: ic.port, mount: ic.mount, user: 'source', password_set: true },
    bundled_bot_id: b.id, last_synced_bot_id: b.id, active: true, unlimited: true, expires_at: null, deletable: false, created_at: iso(now()),
  });
}

/** Sortierung wie die SQL-Abfragen in botSettings() */
function sortedSettings(kind: BotKind, s: AnySettings): AnySettings {
  const c = JSON.parse(JSON.stringify(s));
  if (kind === 'mod') {
    c.banned_words.sort((a: { word: string }, b: { word: string }) => a.word.localeCompare(b.word));
    c.welcomes.sort((a: { id: number }, b: { id: number }) => a.id - b.id);
    c.destinations.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
  }
  return c;
}

type Route = [Method, RegExp, (m: RegExpMatchArray, body: Body, user: { username: string }) => any];
const KB = '(welcome|mod|music)\\/(\\d+)';
const r = (s: string) => new RegExp(`^${s}$`);

const routes: Route[] = [
  ['POST', /^\/auth\/logout$/, () => ({ ok: true })],
  ['GET', /^\/me$/, (_m, _b, u) => ({ user: { id: 1, username: u.username, discord_linked: hasDiscord(u.username) }, limits: BOT_LIMITS, counts: counts() })],
  ['POST', /^\/me\/delete$/, (_m, body, u) => {
    if (typeof body.password !== 'string' || !body.password) fail(400, 'missing_fields', 'password is required');
    if (body.password.length > 200) fail(400, 'invalid_input', 'password too long');
    if (body.password === 'wrong') fail(401, 'invalid_credentials', 'Wrong password');
    // wie der Server: Bots, Tickets, Radios, Wallet + Verknüpfung weg, Konto anonymisiert
    db.deletedUsers.add(u.username.toLowerCase());
    db.bots = [];
    acct.tickets = [];
    acct.replies = {};
    acct.radios = [];
    acct.wallet = { gold_balance: 0, transactions: [] };
    acct.highrise[u.username.toLowerCase()] = null;
    return { ok: true };
  }],
  ['GET', /^\/bots$/, () => ({ bots: (['welcome', 'mod', 'music'] as BotKind[]).flatMap((k) => db.bots.filter((b) => b.kind === k).sort((a, c) => c.id - a.id).map(publicBot)) })],
  ['POST', /^\/bots$/, (_m, body) => {
    const kind = body.kind as BotKind;
    if (kind !== 'welcome' && kind !== 'mod' && kind !== 'music') fail(400, 'invalid_input', 'kind must be welcome, mod or music');
    const name = reqStr(body, 'name', L.name, 'missing_fields');
    const roomRaw = reqStr(body, 'room', 500, 'missing_fields');
    reqStr(body, 'bot_token', L.botToken, 'missing_fields');
    const room = roomOf(roomRaw);
    const msgs: string[] = [];
    if (kind === 'welcome') {
      const raw = body.welcome_messages;
      if (raw !== undefined && raw !== null && !Array.isArray(raw)) fail(400, 'invalid_input', 'welcome_messages must be an array');
      for (const m of (raw ?? []) as unknown[]) {
        if (typeof m !== 'string') fail(400, 'invalid_input', 'welcome_messages must contain strings');
        const s = (m as string).trim();
        if (s.length > L.message) fail(400, 'invalid_input', 'welcome message must be at most 300 characters');
        if (s) msgs.push(s);
      }
      if (msgs.length < 2) fail(400, 'missing_fields', 'at least 2 welcome_messages are required');
    }
    const owner = kind === 'welcome' ? '' : (optUsername(body, 'owner_username') ?? '');
    if (counts()[kind] >= BOT_LIMITS[kind]) fail(403, 'limit_reached', 'Bot limit reached for this kind');
    const b: MockBot = {
      kind, id: nextId++, name, room_id: room.room_id, room_url: room.room_url, status: 'stopped', bot_token_set: true,
      runtime: { unlimited: false, running_until: null, seconds_left: 3600 }, created_at: iso(now()), logs: [],
      settings: botSettingsFor(kind, owner, msgs),
    };
    addLog(b, 'INFO', 'Bot created');
    db.bots.push(b);
    if (kind === 'music') bundledRadio(b);
    return { bot: publicBot(b) };
  }],
  ['GET', r(`\\/bots\\/${KB}`), (m) => {
    const b = findBot(m[1], m[2]);
    return { bot: publicBot(b), settings: sortedSettings(b.kind, b.settings) };
  }],
  ['PATCH', r(`\\/bots\\/${KB}`), (m, body) => {
    const b = findBot(m[1], m[2]);
    let changedConnection = false;
    const next: Partial<MockBot> = {};
    if (body.name !== undefined) next.name = reqStr(body, 'name', L.name);
    if (body.room !== undefined) {
      if (typeof body.room !== 'string') fail(400, 'invalid_input', 'room must be a string');
      if (body.room.length > 500) fail(400, 'invalid_input', 'room must be at most 500 characters');
      const room = roomOf(body.room);
      next.room_id = room.room_id;
      next.room_url = room.room_url ?? (room.room_id === b.room_id ? b.room_url : null);
      if (room.room_id !== b.room_id) changedConnection = true;
    }
    if (body.bot_token !== undefined) {
      reqStr(body, 'bot_token', L.botToken);
      next.bot_token_set = true;
      changedConnection = true;
    }
    let position: Position | undefined;
    if (body.position !== undefined) {
      const p = body.position;
      if (!p || typeof p !== 'object' || Array.isArray(p)) fail(400, 'invalid_input', 'position must be an object');
      const x = finiteNum(p.x, 'position.x');
      const y = finiteNum(p.y, 'position.y');
      const z = finiteNum(p.z, 'position.z');
      const facing = p.facing === undefined ? b.settings.position.facing : p.facing;
      if (typeof facing !== 'string' || !FACINGS.includes(facing as Facing)) fail(400, 'invalid_input', 'position.facing must be one of ' + FACINGS.join(', '));
      position = { x, y, z, facing: facing as Facing };
    }
    let engine: 'js' | 'python' | undefined;
    if (body.engine !== undefined) {
      if (body.engine !== 'js' && body.engine !== 'python') fail(400, 'invalid_input', 'engine must be js or python');
      engine = body.engine;
    }
    let owner: string | undefined;
    if (body.owner_username !== undefined) {
      if (b.kind === 'welcome') fail(400, 'invalid_input', 'owner_username only for mod/music');
      owner = optUsername(body, 'owner_username') ?? '';
    }
    if (!Object.keys(next).length && !position && !engine && owner === undefined) fail(400, 'invalid_input', 'Nothing to update');
    if (owner !== undefined) (b.settings as ModSettings | MusicSettings).owner_username = owner;
    if (engine) (b.settings as { engine?: string }).engine = engine;
    Object.assign(b, next);
    if (position) b.settings.position = position;
    tick(b);
    let restarted = false;
    if (changedConnection && b.status === 'running') {
      addLog(b, 'INFO', 'Settings changed – restarting');
      b.status = 'stopped';
      b.pending = { status: 'running', at: now() + 3000 };
      restarted = true;
    }
    return { bot: publicBot(b), restarted };
  }],
  ['DELETE', r(`\\/bots\\/${KB}`), (m) => {
    const b = findBot(m[1], m[2]);
    db.bots = db.bots.filter((x) => x !== b);
    // wie deleteBotStatements: das inklusive Radio eines DJ-Bots geht mit
    if (b.kind === 'music') acct.radios = acct.radios.filter((st) => st.bundled_bot_id !== b.id);
    return { ok: true };
  }],
  ['POST', r(`\\/bots\\/${KB}\\/(start|stop|restart)`), (m) => power(findBot(m[1], m[2]), m[3] as 'start' | 'stop' | 'restart')],
  ['GET', r(`\\/bots\\/${KB}\\/logs`), (m) => ({ lines: findBot(m[1], m[2]).logs.filter((l) => l !== '').slice(-500) })],
  ['GET', r(`\\/bots\\/${KB}\\/presence`), (m) => ({ events: presenceFor(findBot(m[1], m[2])) })],
  // „Bot zu mir holen“: Bot läuft zur Figur des Besitzers im Raum und speichert die Stelle (Blickrichtung bleibt)
  ['POST', r(`\\/bots\\/${KB}\\/position\\/to_me`), (m, _b, u) => {
    const b = findBot(m[1], m[2]);
    tick(b);
    if (b.status !== 'running') fail(409, 'not_running', 'Bot is not running');
    if (!hrLink(u.username).linked) fail(409, 'highrise_not_linked', 'Link your Highrise account first');
    const f = b.toMeFails?.shift();
    if (f) fail(f.status, f.code, f.message);
    const half = (v: number) => Math.round(v * 2) / 2;
    const position: Position = { x: half(2 + Math.random() * 18), y: 0, z: half(2 + Math.random() * 18), facing: b.settings.position.facing };
    b.settings.position = position;
    addLog(b, 'INFO', `Walked to owner @${u.username} at ${position.x} ${position.y} ${position.z} (saved)`);
    return { ok: true, position };
  }],

  // ---- Welcome ----
  ['POST', /^\/bots\/welcome\/(\d+)\/messages$/, (m, body) => {
    const s = ws(findBot('welcome', m[1]));
    const msg = { id: nextSub++, message: message(body), target_username: optUsername(body, 'target_username'), active: true };
    s.messages.push({ ...msg, priority: 0 });
    return { message: msg };
  }],
  ['PATCH', /^\/bots\/welcome\/(\d+)\/messages\/(\d+)$/, (m, body) => {
    const s = ws(findBot('welcome', m[1]));
    let text: string | undefined;
    let active: boolean | undefined;
    if (body.message !== undefined) text = message(body);
    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') fail(400, 'invalid_input', 'active must be a boolean');
      active = body.active;
    }
    if (text === undefined && active === undefined) fail(400, 'invalid_input', 'Nothing to update');
    const msg = s.messages.find((x) => String(x.id) === m[2]) ?? fail(404, 'not_found', 'Message not found');
    if (text !== undefined) msg.message = text;
    if (active !== undefined) msg.active = active;
    const { priority, ...out } = msg;
    return { message: out };
  }],
  ['DELETE', /^\/bots\/welcome\/(\d+)\/messages\/(\d+)$/, (m) => {
    const s = ws(findBot('welcome', m[1]));
    if (!s.messages.some((x) => String(x.id) === m[2])) fail(404, 'not_found', 'Message not found');
    s.messages = s.messages.filter((x) => String(x.id) !== m[2]);
    return { ok: true };
  }],
  ['POST', /^\/bots\/welcome\/(\d+)\/admins$/, (m, body) => {
    const s = ws(findBot('welcome', m[1]));
    const username = normUsername(body.username);
    if (!s.admins.includes(username)) s.admins.push(username);
    return { ok: true, username };
  }],
  ['DELETE', /^\/bots\/welcome\/(\d+)\/admins\/([^/]+)$/, (m) => {
    const s = ws(findBot('welcome', m[1]));
    const username = normUsername(decodeURIComponent(m[2]));
    if (!s.admins.includes(username)) fail(404, 'not_found', 'Admin not found');
    s.admins = s.admins.filter((x) => x !== username);
    return { ok: true };
  }],

  // ---- Mod ----
  ['POST', /^\/bots\/mod\/(\d+)\/roles$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    const role = body.role as keyof ModSettings['roles'];
    if (typeof role !== 'string' || !(role in s.roles)) fail(400, 'invalid_input', 'role must be admin, moderator or vip');
    const username = normUsername(body.username);
    if (!s.roles[role].includes(username)) s.roles[role].push(username);
    return { ok: true, role, users: [...s.roles[role]] };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/roles\/([^/]+)\/([^/]+)$/, (m) => {
    const s = ms(findBot('mod', m[1]));
    const role = m[2] as keyof ModSettings['roles'];
    if (!(role in s.roles)) fail(400, 'invalid_input', 'role must be admin, moderator or vip');
    const username = normUsername(decodeURIComponent(m[3]));
    s.roles[role] = s.roles[role].filter((x) => x !== username);
    return { ok: true, role, users: [...s.roles[role]] };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/banned_words$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    const word = reqStr(body, 'word', L.word).toLowerCase();
    const action = body.action === undefined ? 'warn' : body.action;
    if (typeof action !== 'string' || !['warn', 'mute', 'kick', 'ban'].includes(action)) fail(400, 'invalid_input', 'action must be warn, mute, kick or ban');
    s.banned_words = [...s.banned_words.filter((w) => w.word !== word), { id: nextSub++, word, action: action as BannedAction }];
    return { ok: true, word, action };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/banned_words\/([^/]+)$/, (m) => {
    const s = ms(findBot('mod', m[1]));
    const word = decodeURIComponent(m[2]).trim().toLowerCase();
    if (!word || word.length > L.word) fail(400, 'invalid_input', 'word must be 1-40 characters');
    if (!s.banned_words.some((w) => w.word === word)) fail(404, 'not_found', 'Word not found');
    s.banned_words = s.banned_words.filter((w) => w.word !== word);
    return { ok: true };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/welcomes$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    const welcome = { id: nextSub++, message: message(body), target_username: optUsername(body, 'target_username'), active: true };
    s.welcomes.push(welcome);
    return { welcome };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/welcomes\/(\d+)$/, (m) => {
    const s = ms(findBot('mod', m[1]));
    if (!s.welcomes.some((w) => String(w.id) === m[2])) fail(404, 'not_found', 'Welcome not found');
    s.welcomes = s.welcomes.filter((w) => String(w.id) !== m[2]);
    return { ok: true };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/destinations$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    const name = reqStr(body, 'name', L.destName).toLowerCase();
    const x = finiteNum(body.x, 'x');
    const y = finiteNum(body.y, 'y');
    const z = finiteNum(body.z, 'z');
    const minRole = body.min_role === undefined ? 'everyone' : body.min_role;
    if (typeof minRole !== 'string' || !['everyone', 'vip', 'moderator', 'admin'].includes(minRole)) fail(400, 'invalid_input', 'min_role must be everyone, vip, moderator or admin');
    // INSERT OR REPLACE (UNIQUE bot_id+name) → gleicher Name ersetzt den alten Eintrag mit neuer ID
    const destination = { id: nextSub++, name, x, y, z, min_role: minRole as MinRole };
    s.destinations = [...s.destinations.filter((d) => d.name !== name), destination];
    return { destination };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/destinations\/(\d+)$/, (m) => {
    const s = ms(findBot('mod', m[1]));
    if (!s.destinations.some((d) => String(d.id) === m[2])) fail(404, 'not_found', 'Destination not found');
    s.destinations = s.destinations.filter((d) => String(d.id) !== m[2]);
    return { ok: true };
  }],

  // ---- Music ----
  ['POST', /^\/bots\/music\/(\d+)\/roles$/, (m, body) => {
    const s = mus(findBot('music', m[1]));
    const role = body.role as keyof MusicSettings['roles'];
    if (typeof role !== 'string' || !(role in s.roles)) fail(400, 'invalid_input', 'role must be mod, dj or vip');
    const username = normUsername(body.username);
    if (!s.roles[role].includes(username)) s.roles[role].push(username);
    return { ok: true, role, users: [...s.roles[role]] };
  }],
  ['DELETE', /^\/bots\/music\/(\d+)\/roles\/([^/]+)\/([^/]+)$/, (m) => {
    const s = mus(findBot('music', m[1]));
    const role = m[2] as keyof MusicSettings['roles'];
    if (!(role in s.roles)) fail(400, 'invalid_input', 'role must be mod, dj or vip');
    const username = normUsername(decodeURIComponent(m[3]));
    s.roles[role] = s.roles[role].filter((x) => x !== username);
    return { ok: true, role, users: [...s.roles[role]] };
  }],
  ['PUT', /^\/bots\/music\/(\d+)\/announcements$/, (m, body) => {
    const s = mus(findBot('music', m[1]));
    if (!Array.isArray(body.lines)) fail(400, 'invalid_input', 'lines must be an array');
    if (body.lines.length > L.announceLines) fail(400, 'invalid_input', 'at most 20 lines');
    const lines: string[] = [];
    for (const l of body.lines as unknown[]) {
      if (typeof l !== 'string') fail(400, 'invalid_input', 'lines must contain strings');
      const t = (l as string).trim();
      if (t.length > L.announceLine) fail(400, 'invalid_input', 'each line must be at most 300 characters');
      if (t) lines.push(t);
    }
    const interval_sec = body.interval_sec === undefined ? s.announcements.interval_sec : intInRange(body.interval_sec, 'interval_sec', L.intervalMin, L.intervalMax);
    s.announcements = { lines, interval_sec };
    return { announcements: { lines, interval_sec } };
  }],
  ['PUT', /^\/bots\/music\/(\d+)\/settings$/, (m, body) => {
    const s = mus(findBot('music', m[1]));
    if (body.max_song_minutes === undefined && body.autoplay === undefined) fail(400, 'invalid_input', 'Nothing to update');
    const minutes = body.max_song_minutes === undefined ? s.max_song_minutes : intInRange(body.max_song_minutes, 'max_song_minutes', L.songMin, L.songMax);
    let autoplay = s.autoplay;
    if (body.autoplay !== undefined) {
      if (typeof body.autoplay !== 'boolean') fail(400, 'invalid_input', 'autoplay must be a boolean');
      autoplay = body.autoplay;
    }
    s.max_song_minutes = minutes;
    s.autoplay = autoplay;
    return { max_song_minutes: minutes, autoplay };
  }],
  ['POST', /^\/bots\/music\/(\d+)\/command$/, (m, body, u) => {
    const b = findBot('music', m[1]);
    const a = body.action;
    const actions = ['play', 'play_top', 'skip', 'clearqueue', 'volup', 'voldown', 'autoplay_on', 'autoplay_off'];
    if (typeof a !== 'string' || !actions.includes(a)) fail(400, 'invalid_input', 'action must be one of ' + actions.join(', '));
    const query = optStr(body, 'query', L.query);
    if ((a === 'play' || a === 'play_top') && !query) fail(400, 'missing_fields', 'query is required for play');
    tick(b);
    if (b.status !== 'running') fail(409, 'bot_not_running', 'Bot is not running');
    addLog(b, 'INFO', `Live command: ${a}${query ? ` "${query}"` : ''}`);
    // wie der Server: landet in music_commands_queue (requested_by = Kontoname), der Agent arbeitet ihn kurz danach ab
    const cmd: MusicRecentCommand = { id: nextSub++, action: a, args: query ? { query } : {}, requested_by: u.username, status: 'pending', result: null, created_at: iso(now()), executed_at: null };
    b.recent = [cmd, ...(b.recent ?? [])].slice(0, 15);
    setTimeout(() => { cmd.status = 'done'; cmd.executed_at = iso(now()); cmd.result = query ? 'Added to queue' : 'OK'; }, 3000);
    return { ok: true, cmd_id: cmd.id };
  }],

  // ===== Erweiterungen (API.md, Stand 23.11.2026) =====
  // ---- Welcome: Beobachten ----
  ['GET', /^\/bots\/welcome\/(\d+)\/tracking$/, (m) => ({ tracking: ws(findBot('welcome', m[1])).tracking ?? [] })],
  ['POST', /^\/bots\/welcome\/(\d+)\/tracking$/, (m, body) => {
    const s = ws(findBot('welcome', m[1]));
    const username = normUsername(body.username);
    s.tracking = s.tracking ?? [];
    const have = s.tracking.find((x) => x.username === username);
    if (have) return { tracking: have };
    const tracking = { id: nextSub++, username, active: true };
    s.tracking.push(tracking);
    return { tracking };
  }],
  ['PATCH', /^\/bots\/welcome\/(\d+)\/tracking\/(\d+)$/, (m, body) => {
    const s = ws(findBot('welcome', m[1]));
    const tr = (s.tracking ?? []).find((x) => String(x.id) === m[2]) ?? fail(404, 'not_found', 'Not found');
    if (typeof body.active !== 'boolean') fail(400, 'invalid_input', 'active must be a boolean');
    tr.active = body.active;
    return { tracking: tr };
  }],
  ['DELETE', /^\/bots\/welcome\/(\d+)\/tracking\/(\d+)$/, (m) => {
    const s = ws(findBot('welcome', m[1]));
    if (!(s.tracking ?? []).some((x) => String(x.id) === m[2])) fail(404, 'not_found', 'Not found');
    s.tracking = (s.tracking ?? []).filter((x) => String(x.id) !== m[2]);
    return { ok: true };
  }],
  // ---- Mod ----
  ['PATCH', /^\/bots\/mod\/(\d+)\/welcomes\/(\d+)$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    const w = s.welcomes.find((x) => String(x.id) === m[2]) ?? fail(404, 'not_found', 'Welcome not found');
    if (body.message !== undefined) w.message = message(body);
    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') fail(400, 'invalid_input', 'active must be a boolean');
      w.active = body.active;
    }
    return { welcome: w };
  }],
  ['PUT', /^\/bots\/mod\/(\d+)\/commands$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    const word = (k: string, def: string) => {
      const v = body[k];
      if (v === undefined) return s.commands[k as 'go' | 'tp'];
      if (v === null || v === '') return def;
      if (typeof v !== 'string' || !/^\S{1,20}$/.test(v)) fail(400, 'invalid_input', `${k} must be 1-20 characters without spaces`);
      return v as string;
    };
    s.commands = { go: word('go', '!go'), tp: word('tp', '!tp') };
    return { commands: s.commands };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/mutes\/([^/]+)$/, (m) => {
    const md = ms(findBot('mod', m[1])).moderation!;
    const u = normUsername(decodeURIComponent(m[2]));
    if (!md.mutes.some((x) => x.username === u)) fail(404, 'not_found', 'No active mute');
    md.mutes = md.mutes.filter((x) => x.username !== u);
    return { ok: true };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/warns\/([^/]+)$/, (m) => {
    const md = ms(findBot('mod', m[1])).moderation!;
    const u = normUsername(decodeURIComponent(m[2]));
    const w = md.warns.find((x) => x.username === u) ?? fail(404, 'not_found', 'No warnings');
    md.warns = md.warns.filter((x) => x !== w);
    return { ok: true, cleared: w.count };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/reports\/(\d+)\/close$/, (m) => {
    const md = ms(findBot('mod', m[1])).moderation!;
    const r = md.reports.find((x) => String(x.id) === m[2]) ?? fail(404, 'not_found', 'Report not found');
    r.status = 'closed';
    return { ok: true };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/tracking$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    const username = normUsername(body.username);
    s.tracking = s.tracking ?? [];
    if (!s.tracking.includes(username)) s.tracking.push(username);
    return { ok: true, username, users: [...s.tracking] };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/tracking\/([^/]+)$/, (m) => {
    const s = ms(findBot('mod', m[1]));
    const u = normUsername(decodeURIComponent(m[2]));
    if (!(s.tracking ?? []).includes(u)) fail(404, 'not_found', 'Not tracked');
    s.tracking = (s.tracking ?? []).filter((x) => x !== u);
    return { ok: true, users: [...s.tracking] };
  }],
  ['PUT', /^\/bots\/mod\/(\d+)\/vip$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    s.vip = s.vip ?? { price: 0, safe_spot: null, zones: [] };
    if (body.safe_spot !== undefined) {
      const p = body.safe_spot;
      s.vip.safe_spot = p === null ? null : { x: finiteNum(p.x, 'x'), y: finiteNum(p.y, 'y'), z: finiteNum(p.z, 'z') };
    }
    if (body.price !== undefined) s.vip.price = intInRange(body.price, 'price', 0, 1000000);
    return { vip: { price: s.vip.price, safe_spot: s.vip.safe_spot } };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/vip_zones$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    s.vip = s.vip ?? { price: 0, safe_spot: null, zones: [] };
    const name = reqStr(body, 'name', L.destName);
    const x = finiteNum(body.x, 'x');
    const z = finiteNum(body.z, 'z');
    const r = Math.abs(finiteNum(body.radius, 'radius'));
    if (r > 1000) fail(400, 'invalid_input', 'radius must be 0-1000');
    const zone: VipZone = { id: nextSub++, name, x1: x - r, z1: z - r, x2: x + r, z2: z + r };
    s.vip.zones.push(zone);
    return { zone };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/vip_zones\/(\d+)$/, (m) => {
    const s = ms(findBot('mod', m[1]));
    if (!s.vip?.zones.some((z) => String(z.id) === m[2])) fail(404, 'not_found', 'Zone not found');
    s.vip!.zones = s.vip!.zones.filter((z) => String(z.id) !== m[2]);
    return { ok: true };
  }],
  ['PUT', /^\/bots\/mod\/(\d+)\/outfit_settings$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    s.outfits = s.outfits ?? { rotate: false, interval_minutes: 10, list: [] };
    if (body.rotate !== undefined) {
      if (typeof body.rotate !== 'boolean') fail(400, 'invalid_input', 'rotate must be a boolean');
      s.outfits.rotate = body.rotate;
    }
    if (body.interval_minutes !== undefined) s.outfits.interval_minutes = intInRange(body.interval_minutes, 'interval_minutes', 1, 10080);
    return { rotate: s.outfits.rotate, interval_minutes: s.outfits.interval_minutes };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/outfits$/, (m, body) => {
    const s = ms(findBot('mod', m[1]));
    s.outfits = s.outfits ?? { rotate: false, interval_minutes: 10, list: [] };
    const name = optStr(body, 'name', 40) || 'Outfit';
    const raw: unknown[] = Array.isArray(body.items) ? body.items : typeof body.items === 'string' ? body.items.split('\n') : fail(400, 'missing_fields', 'items required');
    const items = raw.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => {
      const [id, pal] = x.trim().split(':');
      return { id, palette: pal !== undefined && Number.isFinite(Number(pal)) ? Number(pal) : -1 };
    });
    if (!items.length || items.length > 50) fail(400, 'invalid_input', '1-50 items');
    const outfit = { id: nextSub++, name, items };
    s.outfits.list.push(outfit);
    return { outfit };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/outfits\/(\d+)$/, (m) => {
    const s = ms(findBot('mod', m[1]));
    if (!s.outfits?.list.some((o) => String(o.id) === m[2])) fail(404, 'not_found', 'Outfit not found');
    s.outfits!.list = s.outfits!.list.filter((o) => String(o.id) !== m[2]);
    return { ok: true };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/outfits$/, (m) => {
    const s = ms(findBot('mod', m[1]));
    const deleted = s.outfits?.list.length ?? 0;
    if (s.outfits) s.outfits.list = [];
    return { ok: true, deleted };
  }],
  // ---- Music ----
  ['POST', /^\/bots\/music\/(\d+)\/blocked$/, (m, body) => {
    const s = mus(findBot('music', m[1]));
    const u = normUsername(body.username);
    if (!s.blocked.includes(u)) s.blocked.push(u);
    return { ok: true, username: u, users: [...s.blocked] };
  }],
  ['DELETE', /^\/bots\/music\/(\d+)\/blocked\/([^/]+)$/, (m) => {
    const s = mus(findBot('music', m[1]));
    const u = normUsername(decodeURIComponent(m[2]));
    if (!s.blocked.includes(u)) fail(404, 'not_found', 'Not blocked');
    s.blocked = s.blocked.filter((x) => x !== u);
    return { ok: true, users: [...s.blocked] };
  }],
  ['GET', /^\/bots\/music\/(\d+)\/tickets$/, (m) => ({ tickets: (mus(findBot('music', m[1])).tickets ?? []).filter((t) => t.tickets > 0) })],
  ['POST', /^\/bots\/music\/(\d+)\/tickets$/, (m, body) => {
    const s = mus(findBot('music', m[1]));
    const username = normUsername(body.username);
    const delta = intInRange(body.delta, 'delta', -1000000, 1000000);
    if (delta === 0) fail(400, 'invalid_input', 'delta must not be 0');
    s.tickets = s.tickets ?? [];
    let row = s.tickets.find((t) => t.username === username);
    if (!row) s.tickets.push((row = { username, tickets: 0 }));
    row.tickets = Math.max(0, row.tickets + delta);
    s.tickets = s.tickets.filter((t) => t.tickets > 0);
    return { ok: true, username, tickets: row.tickets };
  }],
  ['GET', /^\/bots\/music\/(\d+)\/commands$/, (m) => ({ commands: findBot('music', m[1]).recent ?? [] })],
  ['PUT', /^\/bots\/music\/(\d+)\/icecast$/, (m, body) => {
    const s = mus(findBot('music', m[1]));
    const host = reqStr(body, 'host', 200);
    const port = intInRange(body.port, 'port', 1, 65535);
    const user = reqStr(body, 'user', 100);
    const mount = reqStr(body, 'mount', 200);
    const pw = optStr(body, 'password', 200);
    if (!pw && !s.icecast?.password_set) fail(400, 'missing_fields', 'password is required (no password stored yet)');
    // wie der Server: neuer Server (Host/Port/Mount) → Hörer-Link neu (eigenes Radio der Seite → https://stream…, sonst abgeleitet)
    const old = s.icecast;
    const changed = !old || old.host !== host || old.port !== port || old.mount !== mount;
    if (changed) {
      const m2 = mount.replace(/^\/+/, '');
      s.stream_url = host === 'radio.highrise-bots.com' ? `https://stream.highrise-bots.com/${m2}` : `http://${host}${port === 80 ? '' : `:${port}`}/${m2}`;
    }
    s.icecast = { host, port, user, mount, password_set: true };
    s.icecast_password_set = true;
    return { icecast: s.icecast, stream_url: s.stream_url };
  }],
  ['GET', /^\/bots\/music\/(\d+)\/autoplay$/, (m) => ({ files: findBot('music', m[1]).autoplay ?? [], max_files: 20, max_bytes: 10485760 })],
  // Upload: der Mock bekommt statt der Datei nur {__file: {name, size, type}} (transport.upload)
  ['POST', /^\/bots\/music\/(\d+)\/autoplay$/, (m, body) => {
    const b = findBot('music', m[1]);
    const f = body.__file as { name?: string; size?: number } | undefined;
    if (!f || !f.name) fail(400, 'missing_fields', 'file is required');
    const name = String(f!.name).trim();
    if (!name || name.length > 200 || /[\/\\]/.test(name)) fail(400, 'invalid_input', 'filename must be 1-200 characters without slashes');
    if (!name.toLowerCase().endsWith('.mp3')) fail(400, 'invalid_input', 'Only .mp3 allowed');
    const size = Number(f!.size) || 0;
    if (size <= 0 || size > 10485760) fail(400, 'invalid_input', 'File size must be 1B - 10MB');
    const list = b.autoplay ?? [];
    if (list.length >= 20) fail(403, 'limit_reached', 'Folder full (max 20 songs)');
    b.autoplay = [...list.filter((x) => x.name !== name), { name, size }];
    return { ok: true, file: { name, size } };
  }],
  ['DELETE', /^\/bots\/music\/(\d+)\/autoplay\/([^/]+)$/, (m) => {
    const b = findBot('music', m[1]);
    const name = decodeURIComponent(m[2]);
    if (!name.toLowerCase().endsWith('.mp3')) fail(400, 'invalid_input', 'Only .mp3 allowed');
    if (!(b.autoplay ?? []).some((f) => f.name === name)) fail(502, 'agent_error', 'file not found');
    b.autoplay = (b.autoplay ?? []).filter((f) => f.name !== name);
    return { ok: true };
  }],
  // ---- Konto ----
  ['POST', /^\/me\/password$/, (_m, body) => {
    if (typeof body.current_password !== 'string' || typeof body.new_password !== 'string' || !body.current_password || !body.new_password) {
      fail(400, 'missing_fields', 'current_password and new_password are required');
    }
    if (body.current_password === 'wrong') fail(401, 'invalid_credentials', 'Current password is wrong');
    if (body.new_password.length < 4 || body.new_password.length > 200) fail(400, 'invalid_input', 'new_password must be 4-200 characters');
    acct.password = body.new_password;
    return { ok: true };
  }],
  ['GET', /^\/me\/link$/, (_m, _b, u) => hrLink(u.username)],
  ['POST', /^\/me\/link$/, (_m, body, u) => {
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code) fail(400, 'missing_fields', 'code is required');
    if (!/^[A-Z0-9]{6}$/.test(code)) fail(400, 'invalid_input', 'code must be 6 characters');
    if (hrLink(u.username).linked) fail(409, 'already_linked', 'Already linked');
    if (code === 'USED00') fail(409, 'code_used', 'Code already used');
    if (code === 'TAKEN0') fail(409, 'highrise_account_taken', 'Highrise account already linked to another account');
    if (code !== 'ABC234') fail(400, 'invalid_code', 'Unknown code');
    const name = u.username.toLowerCase();
    acct.highrise[name] = name;
    return { ok: true, highrise_username: name, claimed_gold: 0 };
  }],
  ['GET', /^\/me\/discord$/, (_m, _b, u) => {
    const linked = hasDiscord(u.username);
    // Mock zeigt die neue Community ToLobby (Server: LINK_GATE="tolobby")
    const name = linked ? u.username.toLowerCase() : null;
    return { provider: 'tolobby', linked, account_name: name, discord_username: name, required: true, verify_url: 'https://highrise-bots.com/verify', invite_url: 'https://tolobby.com/i/DEMO' };
  }],
  // Einmal-Link; im Mock gilt Discord danach als „im Browser verbunden“
  ['POST', /^\/me\/discord\/web_link$/, (_m, _b, u) => {
    db.discordLinked.add(u.username.toLowerCase());
    return { url: 'https://highrise-bots.com/verify', expires_at: iso(now() + 5 * 60000) };
  }],
  ['GET', /^\/me\/wallet$/, (_m, _b, u) => ({
    gold_balance: acct.wallet.gold_balance,
    highrise_linked: hrLink(u.username).linked,
    highrise_username: hrLink(u.username).highrise_username,
    transactions: acct.wallet.transactions.slice(0, 20),
  } satisfies Wallet)],
  // ---- Radio ----
  ['GET', /^\/radio$/, () => ({ stations: acct.radios.map((st) => ({ ...st, status: radioStatus(st) })) })],
  ['GET', /^\/radio\/(\d+)$/, (m) => {
    const st = acct.radios.find((r) => String(r.id) === m[1]) ?? fail(404, 'not_found', 'Station not found');
    return { station: { ...st, status: radioStatus(st) } };
  }],
  ['GET', /^\/radio\/(\d+)\/status$/, (m) => radioStatus(acct.radios.find((r) => String(r.id) === m[1]) ?? fail(404, 'not_found', 'Station not found'))],
  ['POST', /^\/radio\/(\d+)\/sync$/, (m, body) => {
    const st = acct.radios.find((r) => String(r.id) === m[1]) ?? fail(404, 'not_found', 'Station not found');
    if (typeof body.bot_id !== 'number' || !Number.isSafeInteger(body.bot_id) || body.bot_id <= 0) fail(400, 'invalid_input', 'bot_id must be a positive integer');
    const b = db.bots.find((x) => x.kind === 'music' && x.id === body.bot_id) ?? fail(404, 'not_found', 'Music bot not found');
    st.last_synced_bot_id = b.id;
    // wie der Server: Zugangsdaten + Hörer-Link in den Bot
    mus(b).stream_url = st.stream_url;
    mus(b).icecast = { host: st.source.host, port: st.source.port, user: st.source.user, mount: st.mount, password_set: true };
    mus(b).icecast_password_set = true;
    return { ok: true, bot_id: b.id };
  }],
  ['DELETE', /^\/radio\/(\d+)$/, (m) => {
    const st = acct.radios.find((r) => String(r.id) === m[1]) ?? fail(404, 'not_found', 'Station not found');
    if (st.bundled_bot_id) fail(409, 'bundled_station', 'Station belongs to a music bot');
    if (!st.deletable) fail(409, 'subscription_active', 'Station is still active');
    acct.radios = acct.radios.filter((r) => r !== st);
    return { ok: true };
  }],
  // ---- Nachrichten ans Team ----
  ['GET', /^\/me\/tickets$/, () => ({
    tickets: [...acct.tickets].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .map(({ id, subject, status, created_at, updated_at }) => ({ id, subject, status, created_at, updated_at })),
  })],
  ['POST', /^\/me\/tickets$/, (_m, body) => {
    const subject = reqStr(body, 'subject', 200, 'missing_fields');
    const text = reqStr(body, 'body', 4000, 'missing_fields');
    if (text.length < 10) fail(400, 'invalid_input', 'body must be at least 10 characters');
    const image = optImage(body);
    let bot: SupportTicketDetail['bot'] = null;
    if (body.bot_kind !== undefined && body.bot_kind !== null) {
      if (body.bot_kind !== 'welcome' && body.bot_kind !== 'mod') fail(400, 'invalid_input', 'bot_kind must be welcome or mod');
      if (typeof body.bot_id !== 'number' || !Number.isSafeInteger(body.bot_id) || body.bot_id <= 0) fail(400, 'invalid_input', 'bot_id must be a positive integer');
      const b = findBot(body.bot_kind, String(body.bot_id));
      bot = { kind: b.kind, id: b.id, name: b.name };
    }
    if (acct.tickets.filter((t) => t.status !== 'closed').length >= 5) fail(403, 'limit_reached', 'You already have 5 open tickets');
    const tk: SupportTicketDetail = { id: nextTicket++, subject, status: 'open', created_at: iso(now()), updated_at: iso(now()), body: text, bot, image };
    acct.tickets.push(tk);
    acct.replies[tk.id] = [];
    return { ticket: tk };
  }],
  ['GET', /^\/me\/tickets\/(\d+)$/, (m) => {
    const ticket = acct.tickets.find((t) => String(t.id) === m[1]) ?? fail(404, 'not_found', 'Ticket not found');
    return { ticket, replies: acct.replies[ticket.id] ?? [] };
  }],
  ['POST', /^\/me\/tickets\/(\d+)\/replies$/, (m, body, u) => {
    const tk = acct.tickets.find((t) => String(t.id) === m[1]) ?? fail(404, 'not_found', 'Ticket not found');
    const text = reqStr(body, 'body', 4000, 'missing_fields');
    if (text.length < 2) fail(400, 'invalid_input', 'body must be at least 2 characters');
    const image = optImage(body);
    if (tk.status === 'closed') fail(409, 'ticket_closed', 'This ticket is closed');
    const reply: SupportReply = { id: nextSub++, author: 'user', author_name: u.username, body: text, image, created_at: iso(now()) };
    (acct.replies[tk.id] = acct.replies[tk.id] ?? []).push(reply);
    tk.status = 'open';
    tk.updated_at = iso(now());
    return { reply };
  }],
  // ---- Hilfe-Chatbot ----
  ['POST', /^\/chat$/, (_m, body) => {
    // Prüfungen wie api_v1_account.ts POST /chat
    if (!Array.isArray(body.messages) || !body.messages.length) fail(400, 'invalid_input', 'messages must be a non-empty array');
    if (body.messages.length > 50) fail(400, 'invalid_input', 'at most 50 messages');
    for (const mm of body.messages as { role?: unknown; content?: unknown }[]) {
      if (!mm || (mm.role !== 'user' && mm.role !== 'assistant') || typeof mm.content !== 'string') fail(400, 'invalid_input', 'each message must be {role: user|assistant, content: string}');
      if ((mm.content as string).length > 2000) fail(400, 'invalid_input', 'message content must be at most 2000 characters');
    }
    const lastMsg = body.messages[body.messages.length - 1];
    if (lastMsg.role !== 'user' || !String(lastMsg.content).trim()) fail(400, 'invalid_input', 'the last message must be a non-empty user message');
    if (body.lang !== undefined && (typeof body.lang !== 'string' || !/^[a-z]{2}$/.test(body.lang))) fail(400, 'invalid_input', 'lang must be a 2-letter language code');
    const image = optImage(body);
    const last = String(lastMsg.content).toLowerCase();
    const de = body.lang === 'de';
    const ar = body.lang === 'ar';
    if (image) {
      return { reply: ar ? 'شكرًا على الصورة! يبدو أن البوت ليس لديه صلاحية Designer. 🙂' : de ? 'Danke für das Bild! Es sieht so aus, als hätte der Bot keine Designer-Rechte. 🙂' : 'Thanks for the picture! It looks like the bot has no Designer rights. 🙂', limit_reached: false };
    }
    const reply = /designer|room|raum|غرف/.test(last)
      ? ar ? 'أعطِ البوت صلاحية Designer في غرفتك، ثم أطفئه وشغّله. 🙂' : de ? 'Gib dem Bot Designer-Rechte in deinem Raum und schalte ihn dann aus und wieder an. 🙂' : 'Give the bot Designer rights in your room, then turn it off and on again. 🙂'
      : ar ? 'أنا مساعد تجريبي. اسألني عن البوتات! 🤖' : de ? 'Ich bin ein Demo-Helfer. Frag mich zu deinen Bots! 🤖' : 'I am a demo helper. Ask me about your bots! 🤖';
    return { reply, limit_reached: false };
  }],
];

export const mockHandler: Handler = async (method, path, body, token) => {
  await wait(180 + Math.random() * 220);
  const b: Body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  if (method === 'POST' && path === '/auth/login') {
    if (typeof b.username !== 'string' || typeof b.password !== 'string' || !b.username.trim() || !b.password) {
      fail(400, 'missing_fields', 'username and password are required');
    }
    if (b.password === 'wrong') fail(401, 'invalid_credentials', 'Wrong username or password');
    const username = String(b.username).trim();
    if (username.toLowerCase() === 'disabled') fail(403, 'account_disabled', 'Account disabled');
    db.deletedUsers.delete(username.toLowerCase());
    return {
      token: `mock-${encodeURIComponent(username)}`,
      expires_at: iso(now() + 180 * 86400_000),
      user: { id: 1, username, discord_linked: hasDiscord(username) },
    };
  }
  // ---- ohne Token: Einladung prüfen / Registrieren (api_v1_public.ts). Test-Codes: DEMO-INVITE-1234, DISCORD-INVITE-1234 ----
  const inv = method === 'GET' && path.match(/^\/auth\/invite\/([^/]+)$/);
  if (inv) {
    const i = db.invites[decodeURIComponent(inv[1])] ?? fail(404, 'invalid_invite', 'This invite link is invalid or has already been used');
    return { valid: true, limits: i.limits, free_welcome: i.free_welcome, discord_linked: i.discord };
  }
  if (method === 'POST' && path === '/auth/register') {
    if (typeof b.invite !== 'string' || typeof b.username !== 'string' || typeof b.password !== 'string' || !b.invite.trim() || !b.username.trim() || !b.password) {
      fail(400, 'missing_fields', 'invite, username and password are required');
    }
    const username = String(b.username).trim();
    if (!/^[A-Za-z0-9._-]{2,32}$/.test(username)) fail(400, 'invalid_input', 'username must be 2-32 characters: letters, numbers, . _ -');
    if (b.password.length < 4 || b.password.length > 200) fail(400, 'invalid_input', 'password must be 4-200 characters');
    if (b.accept_terms !== true) fail(400, 'invalid_input', 'accept_terms must be true (Terms of Service and Privacy Policy)');
    const code = String(b.invite).trim();
    const i = db.invites[code] ?? fail(404, 'invalid_invite', 'This invite link is invalid or has already been used');
    const lower = username.toLowerCase();
    if (['bbos', 'demo', 'admin', 'nodiscord'].includes(lower) || db.registered.has(lower)) fail(409, 'username_taken', 'This username is already taken');
    delete db.invites[code];
    db.registered.add(lower);
    if (i.discord) db.discordLinked.add(lower);
    db.deletedUsers.delete(lower);
    return {
      token: `mock-${encodeURIComponent(username)}`,
      expires_at: iso(now() + 180 * 86400_000),
      user: { id: 2, username, discord_linked: i.discord },
      free_welcome: i.free_welcome,
    };
  }
  // Bearer-Pflicht für alles außer Login (auch Logout), dann Discord-Pflicht außer /me, /me/delete, /auth/*
  const u = userFromToken(token);
  // der Bot muss erst hinlaufen – Antwort kommt etwas später (Lade-Anzeige testen)
  if (method === 'POST' && path.endsWith('/position/to_me')) await wait(1200);
  const exempt = path === '/me' || path === '/me/delete' || path === '/me/discord' || path === '/me/discord/web_link' || path.startsWith('/auth/');
  if (!u.discord_linked && !exempt) fail(403, 'discord_required', 'Link your Discord account on the website first');
  for (const [m, re, fn] of routes) {
    if (m !== method) continue;
    const match = path.match(re);
    if (!match) continue;
    return JSON.parse(JSON.stringify(fn(match, b, u)));
  }
  return fail(404, 'not_found', 'Endpoint not found');
};

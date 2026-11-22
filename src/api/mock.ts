// Test-Server im Speicher (EXPO_PUBLIC_API_MOCK=1): spielt die API aus API.md nach, damit die App ohne highrise-bots.com
// ganz durchgetestet werden kann. Stand geht beim Neuladen verloren.
//
// Besondere Testfälle:
//   Passwort „wrong“                → 401 invalid_credentials (Anmelden, Konto löschen)
//   Benutzername „nodiscord“        → Konto ohne Discord → 403 discord_required für alle Bot-Aufrufe
//   Bot „Party Welcome“             → keine Laufzeit → 402 no_runtime beim Start
//   Bot „Chill Radio“               → 1. Start: 502 agent_unreachable, 2. Start: stürzt ab (Beheben-Blatt), 3. klappt
//   Raum-ID 000000000000000000000000 → 400 invalid_room
import { ApiError, type Handler, type Method } from './transport';
import type {
  BannedAction, Bot, BotKind, BotStatus, MinRole, ModSettings, MusicSettings, Position, WelcomeSettings,
} from './types';
import { parseRoom } from './room';

type MockBot = Bot & {
  settings: WelcomeSettings | ModSettings | MusicSettings;
  /** Zustand, den der „Agent“ nach kurzer Zeit meldet */
  pending?: { status: BotStatus; at: number };
  /** Zeitpunkt (ms), seit dem der Bot Laufzeit verbraucht */
  runningSince?: number;
  agentDownOnce?: boolean;
  /** nächster Start stürzt ab (z. B. fehlende Designer-Rechte) */
  crashOnce?: boolean;
  logs: string[];
};

const now = () => Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const ago = (min: number) => iso(now() - min * 60000);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(status, code, message);
};

let nextId = 20;
let nextSub = 100;
const pos = (x: number, y: number, z: number, facing: Position['facing'] = 'FrontRight'): Position => ({ x, y, z, facing });

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

const db: { bots: MockBot[]; deletedUsers: Set<string>; presence: Record<string, { event: string; username: string; created_at: string }[]> } = {
  deletedUsers: new Set(),
  presence: {},
  bots: [
    {
      kind: 'welcome', id: 4, name: 'Lobby Greeter', room_id: '64f1a2b3c4d5e6f708192a3b',
      room_url: 'https://high.rs/room?id=64f1a2b3c4d5e6f708192a3b', status: 'running',
      runtime: { unlimited: false, running_until: null, seconds_left: 2 * 3600 + 13 * 60 + 40 },
      created_at: '2026-03-04T12:38:47Z', runningSince: now(), logs: logLines('Lobby Greeter'),
      settings: {
        bot_token_set: true, position: pos(14.5, 0.25, 9, 'FrontLeft'),
        messages: [
          { id: 14, message: 'Welcome to the room, {username} ❤️', target_username: null, active: true },
          { id: 15, message: 'Great to see you today, {username} 🤍', target_username: null, active: true },
          { id: 16, message: 'The boss is here! Hi {username} 👑', target_username: 'bbos', active: false },
        ],
        admins: ['bbos'],
      } as WelcomeSettings,
    },
    {
      kind: 'mod', id: 3, name: 'Club Guard', room_id: '6512aa0b9c8d7e6f5a4b3c2d',
      room_url: 'https://highrise.game/en/room/6512aa0b9c8d7e6f5a4b3c2d', status: 'stopped',
      runtime: { unlimited: true, running_until: null, seconds_left: 0 },
      created_at: '2026-03-13T21:20:00Z', logs: logLines('Club Guard'),
      settings: {
        bot_token_set: true, position: pos(10, 0, 10), owner_username: 'bbos',
        roles: { admin: ['bbos'], moderator: ['mila_x', 'k1ra'], vip: ['dj.nova'] },
        banned_words: [{ word: 'spam', action: 'warn' }, { word: 'scam', action: 'kick' }, { word: 'hack', action: 'ban' }],
        welcomes: [{ id: 31, message: 'Welcome {username}! Type !rules for the rules.', target_username: null }],
        destinations: [
          { id: 3, name: 'vip', x: 14.5, y: 8.5, z: 28.5, min_role: 'vip' },
          { id: 4, name: 'mod', x: 13.5, y: 15.5, z: 24, min_role: 'moderator' },
          { id: 5, name: 'dj', x: 14.5, y: 15.5, z: 17, min_role: 'everyone' },
        ],
      } as ModSettings,
    },
    {
      kind: 'music', id: 7, name: 'Chill Radio', room_id: '65aa77bb88cc99dd00ee11ff',
      room_url: 'https://high.rs/room?id=65aa77bb88cc99dd00ee11ff', status: 'crashed',
      runtime: { unlimited: false, running_until: null, seconds_left: 45 * 60 },
      created_at: '2026-06-01T18:00:00Z', agentDownOnce: true, crashOnce: true,
      logs: [...logLines('Chill Radio'), `${iso(now() - 60000).replace('T', ' ').slice(0, 19)} ERROR Stream encoder exited with code 1`],
      settings: {
        bot_token_set: true, position: null,
        roles: { mod: ['mila_x'], dj: ['dj.nova', 'beatz'], vip: [] },
        announcements: { lines: ['Request songs with !play <song>', 'Skip with !skip (DJs only)'], interval_sec: 600 },
        max_song_minutes: 8, autoplay: true,
      } as MusicSettings,
    },
    {
      kind: 'welcome', id: 9, name: 'Party Welcome', room_id: '66bb00112233445566778899',
      room_url: null, status: 'stopped',
      runtime: { unlimited: false, running_until: null, seconds_left: 0 },
      created_at: '2026-10-02T09:10:00Z', logs: [],
      settings: {
        bot_token_set: true, position: null,
        messages: [
          { id: 40, message: 'Hey {username}, the party is on! 🎉', target_username: null, active: true },
          { id: 41, message: 'Welcome {username}, grab a drink 🍹', target_username: null, active: true },
        ],
        admins: [],
      } as WelcomeSettings,
    },
  ],
};

// ---- Laufzeit / Status wie der Agent: Status ändert sich erst nach kurzer Zeit ----
function tick(b: MockBot) {
  if (b.pending && now() >= b.pending.at) {
    b.status = b.pending.status;
    b.pending = undefined;
  }
  if (b.status === 'running' && b.runningSince && !b.runtime.unlimited) {
    const used = Math.floor((now() - b.runningSince) / 1000);
    b.runtime.seconds_left = Math.max(0, b.runtime.seconds_left - used);
    b.runningSince = now();
    if (b.runtime.seconds_left === 0) {
      b.status = 'stopped';
      b.runningSince = undefined;
    }
  }
  b.runtime.running_until =
    b.status === 'running' && !b.runtime.unlimited ? iso(now() + b.runtime.seconds_left * 1000) : null;
}

function publicBot(b: MockBot): Bot {
  tick(b);
  const { settings, pending, runningSince, agentDownOnce, logs, ...bot } = b;
  return JSON.parse(JSON.stringify(bot));
}

function presenceFor(b: MockBot) {
  const key = `${b.kind}:${b.id}`;
  if (!db.presence[key]) {
    const names = ['mila_x', 'dj.nova', 'k1ra', 'beatz', 'lunaa', 'bbos', 'ghost_rider'];
    db.presence[key] = b.logs.length
      ? names.flatMap((n, i) => [
          { event: 'join', username: n, created_at: ago(5 + i * 11) },
          ...(i % 2 ? [{ event: 'leave', username: n, created_at: ago(2 + i * 9) }] : []),
        ]).sort((a, c) => c.created_at.localeCompare(a.created_at))
      : [];
  }
  return db.presence[key];
}

function userFromToken(token: string | null) {
  if (!token || !token.startsWith('mock-')) fail(401, 'unauthorized', 'Missing or invalid token');
  const username = decodeURIComponent(token!.slice(5));
  if (db.deletedUsers.has(username.toLowerCase())) fail(401, 'unauthorized', 'Account deleted');
  return { id: 1, username, discord_linked: username.toLowerCase() !== 'nodiscord' };
}

const LIMITS: Record<BotKind, number> = { welcome: 3, mod: 2, music: 2 };
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

const clean = (u: unknown) => String(u ?? '').trim().replace(/^@/, '').toLowerCase();
const need = (v: unknown, field: string) => {
  if (v === undefined || v === null || String(v).trim() === '') fail(400, 'missing_fields', `Missing field: ${field}`);
};
function roomOf(input: unknown) {
  const r = parseRoom(String(input ?? ''));
  if (!r.ok || r.roomId === '000000000000000000000000') fail(400, 'invalid_room', 'Room link or ID is not valid');
  return (r as { roomId: string }).roomId;
}

function addLog(b: MockBot, level: 'INFO' | 'WARNING' | 'ERROR', text: string) {
  b.logs.push(`${iso(now()).replace('T', ' ').slice(0, 19)} ${level.padEnd(5)} ${text}`);
}

function power(b: MockBot, action: string) {
  tick(b);
  if (action === 'stop') {
    addLog(b, 'INFO', 'Stop requested');
    b.pending = { status: 'stopped', at: now() + 1500 };
    b.runningSince = undefined;
    return { ok: true, status_hint: 'stopping', message_key: 'bot_stopping' };
  }
  if (!b.runtime.unlimited && b.runtime.seconds_left <= 0) fail(402, 'no_runtime', 'No runtime left');
  if (b.agentDownOnce) {
    b.agentDownOnce = false;
    fail(502, 'agent_unreachable', 'Bot host did not respond');
  }
  addLog(b, 'INFO', action === 'restart' ? 'Restart requested' : 'Start requested');
  if (b.crashOnce) {
    b.crashOnce = false;
    b.pending = { status: 'crashed', at: now() + 2500 };
    setTimeout(() => addLog(b, 'ERROR', 'Cannot enter room: bot has no designer rights'), 2500);
    return { ok: true, status_hint: 'starting', message_key: 'bot_starting' };
  }
  if (action === 'restart') b.status = 'stopped';
  b.pending = { status: 'running', at: now() + (action === 'restart' ? 3500 : 2500) };
  b.runningSince = now();
  setTimeout(() => addLog(b, 'INFO', 'Connected to room'), action === 'restart' ? 3500 : 2500);
  return { ok: true, status_hint: action === 'restart' ? 'restarting' : 'starting', message_key: `bot_${action}ing` };
}

type Route = [Method, RegExp, (m: RegExpMatchArray, body: any, token: string | null) => any];

const routes: Route[] = [
  ['POST', /^\/auth\/login$/, (_m, body) => {
    need(body?.username, 'username');
    need(body?.password, 'password');
    if (body.password === 'wrong') fail(401, 'invalid_credentials', 'Wrong username or password');
    if (String(body.username).toLowerCase() === 'disabled') fail(403, 'account_disabled', 'Account disabled');
    const username = String(body.username).trim();
    db.deletedUsers.delete(username.toLowerCase());
    return { token: `mock-${encodeURIComponent(username)}`, user: { id: 1, username, discord_linked: username.toLowerCase() !== 'nodiscord' } };
  }],
  ['POST', /^\/auth\/logout$/, () => ({ ok: true })],
  ['GET', /^\/me$/, (_m, _b, t) => ({ user: userFromToken(t), limits: LIMITS, counts: counts() })],
  ['POST', /^\/me\/delete$/, (_m, body, t) => {
    const u = userFromToken(t);
    need(body?.password, 'password');
    if (body.password === 'wrong') fail(401, 'invalid_credentials', 'Wrong password');
    db.deletedUsers.add(u.username.toLowerCase());
    db.bots = [];
    return { ok: true };
  }],
  ['GET', /^\/bots$/, () => ({ bots: db.bots.map(publicBot) })],
  ['POST', /^\/bots$/, (_m, body) => {
    const kind = body?.kind as BotKind;
    if (!['welcome', 'mod', 'music'].includes(kind)) fail(400, 'missing_fields', 'Missing field: kind');
    need(body.name, 'name');
    need(body.room, 'room');
    need(body.bot_token, 'bot_token');
    const room_id = roomOf(body.room);
    if (counts()[kind] >= LIMITS[kind]) fail(403, 'limit_reached', 'Bot limit reached for this kind');
    const msgs: string[] = (body.welcome_messages ?? []).map((s: string) => String(s).trim()).filter(Boolean);
    if (kind === 'welcome' && msgs.length < 2) fail(400, 'missing_fields', 'At least 2 welcome messages required');
    const id = nextId++;
    const common = { bot_token_set: true, position: null };
    const settings =
      kind === 'welcome'
        ? ({ ...common, messages: msgs.map((m) => ({ id: nextSub++, message: m, target_username: null, active: true })), admins: [] } as WelcomeSettings)
        : kind === 'mod'
          ? ({ ...common, owner_username: clean(body.owner_username) || null, roles: { admin: [], moderator: [], vip: [] }, banned_words: [], welcomes: [], destinations: [] } as ModSettings)
          : ({ ...common, roles: { mod: [], dj: [], vip: [] }, announcements: { lines: [], interval_sec: 600 }, max_song_minutes: 10, autoplay: false } as MusicSettings);
    const b: MockBot = {
      kind, id, name: String(body.name).trim(), room_id, room_url: /^[a-f0-9]{24}$/i.test(String(body.room).trim()) ? null : String(body.room).trim(),
      status: 'stopped', runtime: { unlimited: false, running_until: null, seconds_left: 3600 }, created_at: iso(now()), logs: [], settings,
    };
    addLog(b, 'INFO', 'Bot created');
    db.bots.push(b);
    return { bot: publicBot(b) };
  }],
  ['GET', /^\/bots\/(\w+)\/(\d+)$/, (m) => {
    const b = findBot(m[1], m[2]);
    return { bot: publicBot(b), settings: JSON.parse(JSON.stringify(b.settings)) };
  }],
  ['PATCH', /^\/bots\/(\w+)\/(\d+)$/, (m, body) => {
    const b = findBot(m[1], m[2]);
    let restart = false;
    if (body?.name !== undefined) { need(body.name, 'name'); b.name = String(body.name).trim(); }
    if (body?.room !== undefined) {
      b.room_id = roomOf(body.room);
      b.room_url = /^[a-f0-9]{24}$/i.test(String(body.room).trim()) ? null : String(body.room).trim();
      restart = true;
    }
    if (body?.bot_token !== undefined) { need(body.bot_token, 'bot_token'); b.settings.bot_token_set = true; restart = true; }
    if (body?.position) {
      const p = body.position;
      b.settings.position = { x: Number(p.x) || 0, y: Number(p.y) || 0, z: Number(p.z) || 0, facing: p.facing || 'FrontRight' };
    }
    tick(b);
    if (restart && b.status === 'running') { addLog(b, 'INFO', 'Settings changed – restarting'); b.status = 'stopped'; b.pending = { status: 'running', at: now() + 3000 }; }
    return { bot: publicBot(b) };
  }],
  ['DELETE', /^\/bots\/(\w+)\/(\d+)$/, (m) => {
    const b = findBot(m[1], m[2]);
    db.bots = db.bots.filter((x) => x !== b);
    return { ok: true };
  }],
  ['POST', /^\/bots\/(\w+)\/(\d+)\/(start|stop|restart)$/, (m) => power(findBot(m[1], m[2]), m[3])],
  ['GET', /^\/bots\/(\w+)\/(\d+)\/logs$/, (m) => ({ lines: findBot(m[1], m[2]).logs.slice(-200) })],
  ['GET', /^\/bots\/(\w+)\/(\d+)\/presence$/, (m) => ({ events: presenceFor(findBot(m[1], m[2])) })],

  // ---- Welcome ----
  ['POST', /^\/bots\/welcome\/(\d+)\/messages$/, (m, body) => {
    need(body?.message, 'message');
    const s = findBot('welcome', m[1]).settings as WelcomeSettings;
    s.messages.push({ id: nextSub++, message: String(body.message).trim(), target_username: clean(body.target_username) || null, active: true });
    return { ok: true };
  }],
  ['PATCH', /^\/bots\/welcome\/(\d+)\/messages\/(\d+)$/, (m, body) => {
    const s = findBot('welcome', m[1]).settings as WelcomeSettings;
    const msg = s.messages.find((x) => String(x.id) === m[2]) ?? fail(404, 'not_found', 'Message not found');
    if (body?.message !== undefined) { need(body.message, 'message'); msg.message = String(body.message).trim(); }
    if (body?.active !== undefined) msg.active = !!body.active;
    return { ok: true };
  }],
  ['DELETE', /^\/bots\/welcome\/(\d+)\/messages\/(\d+)$/, (m) => {
    const s = findBot('welcome', m[1]).settings as WelcomeSettings;
    s.messages = s.messages.filter((x) => String(x.id) !== m[2]);
    return { ok: true };
  }],
  ['POST', /^\/bots\/welcome\/(\d+)\/admins$/, (m, body) => {
    need(body?.username, 'username');
    const s = findBot('welcome', m[1]).settings as WelcomeSettings;
    const u = clean(body.username);
    if (!s.admins.includes(u)) s.admins.push(u);
    return { ok: true };
  }],
  ['DELETE', /^\/bots\/welcome\/(\d+)\/admins\/([^/]+)$/, (m) => {
    const s = findBot('welcome', m[1]).settings as WelcomeSettings;
    s.admins = s.admins.filter((x) => x !== decodeURIComponent(m[2]));
    return { ok: true };
  }],

  // ---- Mod ----
  ['POST', /^\/bots\/mod\/(\d+)\/roles$/, (m, body) => {
    need(body?.username, 'username');
    const s = findBot('mod', m[1]).settings as ModSettings;
    const role = body.role as keyof ModSettings['roles'];
    if (!s.roles[role]) fail(400, 'invalid_role', 'Unknown role');
    const u = clean(body.username);
    if (!s.roles[role].includes(u)) s.roles[role].push(u);
    return { ok: true };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/roles\/(\w+)\/([^/]+)$/, (m) => {
    const s = findBot('mod', m[1]).settings as ModSettings;
    const role = m[2] as keyof ModSettings['roles'];
    if (s.roles[role]) s.roles[role] = s.roles[role].filter((x) => x !== decodeURIComponent(m[3]));
    return { ok: true };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/banned_words$/, (m, body) => {
    need(body?.word, 'word');
    const s = findBot('mod', m[1]).settings as ModSettings;
    const word = String(body.word).trim().toLowerCase();
    const action = (['warn', 'mute', 'kick', 'ban'].includes(body.action) ? body.action : 'warn') as BannedAction;
    s.banned_words = [...s.banned_words.filter((w) => w.word !== word), { word, action }];
    return { ok: true };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/banned_words\/([^/]+)$/, (m) => {
    const s = findBot('mod', m[1]).settings as ModSettings;
    s.banned_words = s.banned_words.filter((w) => w.word !== decodeURIComponent(m[2]));
    return { ok: true };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/welcomes$/, (m, body) => {
    need(body?.message, 'message');
    const s = findBot('mod', m[1]).settings as ModSettings;
    s.welcomes.push({ id: nextSub++, message: String(body.message).trim(), target_username: clean(body.target_username) || null });
    return { ok: true };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/welcomes\/(\d+)$/, (m) => {
    const s = findBot('mod', m[1]).settings as ModSettings;
    s.welcomes = s.welcomes.filter((w) => String(w.id) !== m[2]);
    return { ok: true };
  }],
  ['POST', /^\/bots\/mod\/(\d+)\/destinations$/, (m, body) => {
    need(body?.name, 'name');
    const s = findBot('mod', m[1]).settings as ModSettings;
    const min_role = (['everyone', 'vip', 'moderator', 'admin'].includes(body.min_role) ? body.min_role : 'everyone') as MinRole;
    s.destinations.push({ id: nextSub++, name: String(body.name).trim().toLowerCase(), x: Number(body.x) || 0, y: Number(body.y) || 0, z: Number(body.z) || 0, min_role });
    return { ok: true };
  }],
  ['DELETE', /^\/bots\/mod\/(\d+)\/destinations\/(\d+)$/, (m) => {
    const s = findBot('mod', m[1]).settings as ModSettings;
    s.destinations = s.destinations.filter((d) => String(d.id) !== m[2]);
    return { ok: true };
  }],

  // ---- Music ----
  ['POST', /^\/bots\/music\/(\d+)\/roles$/, (m, body) => {
    need(body?.username, 'username');
    const s = findBot('music', m[1]).settings as MusicSettings;
    const role = body.role as keyof MusicSettings['roles'];
    if (!s.roles[role]) fail(400, 'invalid_role', 'Unknown role');
    const u = clean(body.username);
    if (!s.roles[role].includes(u)) s.roles[role].push(u);
    return { ok: true };
  }],
  ['DELETE', /^\/bots\/music\/(\d+)\/roles\/(\w+)\/([^/]+)$/, (m) => {
    const s = findBot('music', m[1]).settings as MusicSettings;
    const role = m[2] as keyof MusicSettings['roles'];
    if (s.roles[role]) s.roles[role] = s.roles[role].filter((x) => x !== decodeURIComponent(m[3]));
    return { ok: true };
  }],
  ['PUT', /^\/bots\/music\/(\d+)\/announcements$/, (m, body) => {
    const s = findBot('music', m[1]).settings as MusicSettings;
    const lines = (body?.lines ?? []).map((l: string) => String(l).trim()).filter(Boolean);
    if (lines.length > 20) fail(400, 'too_many_lines', 'At most 20 lines');
    const iv = Number(body?.interval_sec);
    if (!(iv >= 30 && iv <= 3600)) fail(400, 'invalid_interval', 'Interval must be 30–3600 seconds');
    s.announcements = { lines, interval_sec: Math.round(iv) };
    return { ok: true };
  }],
  ['PUT', /^\/bots\/music\/(\d+)\/settings$/, (m, body) => {
    const s = findBot('music', m[1]).settings as MusicSettings;
    if (body?.max_song_minutes !== undefined) {
      const v = Number(body.max_song_minutes);
      if (!(v >= 1)) fail(400, 'invalid_value', 'Max song length must be at least 1 minute');
      s.max_song_minutes = Math.round(v);
    }
    if (body?.autoplay !== undefined) s.autoplay = !!body.autoplay;
    return { ok: true };
  }],
  ['POST', /^\/bots\/music\/(\d+)\/command$/, (m, body) => {
    const b = findBot('music', m[1]);
    tick(b);
    if (b.status !== 'running') fail(409, 'bot_not_running', 'Bot is not running');
    const a = String(body?.action);
    if (!['play', 'play_top', 'skip', 'clearqueue', 'volup', 'voldown', 'autoplay_on', 'autoplay_off'].includes(a)) fail(400, 'invalid_action', 'Unknown action');
    if ((a === 'play' || a === 'play_top') && !String(body?.query ?? '').trim()) fail(400, 'missing_fields', 'Missing field: query');
    if (a === 'autoplay_on' || a === 'autoplay_off') (b.settings as MusicSettings).autoplay = a === 'autoplay_on';
    addLog(b, 'INFO', `Live command: ${a}${body?.query ? ` "${body.query}"` : ''}`);
    return { ok: true };
  }],
];

export const mockHandler: Handler = async (method, path, body, token) => {
  await wait(180 + Math.random() * 220);
  for (const [m, re, fn] of routes) {
    if (m !== method) continue;
    const match = path.match(re);
    if (!match) continue;
    if (!path.startsWith('/auth/')) {
      const u = userFromToken(token);
      if (!u.discord_linked && path !== '/me' && path !== '/me/delete') fail(403, 'discord_required', 'Link your Discord account first');
    }
    return JSON.parse(JSON.stringify(fn(match, body ?? {}, token)));
  }
  return fail(404, 'not_found', `No route ${method} ${path}`);
};

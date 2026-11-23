// Raum-Link oder Raum-ID prüfen – gleiche Regeln wie die Webseite (bots.ts: ownedRoomId=…, ?id=…, sonst 24-Hex),
// zusätzlich /room/<id> in highrise.game-Links.
const HEX24 = /^[a-f0-9]{24}$/i;

export type RoomCheck = { ok: true; roomId: string } | { ok: false; reason: 'empty' | 'host' | 'no_id' | 'format' };

export function parseRoom(input: string): RoomCheck {
  const s = input.trim();
  if (!s) return { ok: false, reason: 'empty' };
  if (HEX24.test(s)) return { ok: true, roomId: s.toLowerCase() };
  const looksLikeLink = /^(https?:\/\/)?([\w-]+\.)*[\w-]+\.[a-z]{2,}(\/|\?|$)/i.test(s);
  if (!looksLikeLink) return { ok: false, reason: 'format' };
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  let host = '';
  try {
    host = new URL(withProto).hostname.toLowerCase();
  } catch {
    return { ok: false, reason: 'format' };
  }
  const allowed = host === 'high.rs' || host.endsWith('.high.rs') || host === 'highrise.game' || host.endsWith('.highrise.game');
  if (!allowed) return { ok: false, reason: 'host' };
  // genau die Formen, die der Server annimmt (bots_core.ts parseRoomInput) – sonst käme 400 invalid_room
  const m =
    s.match(/[?&]ownedRoomId=([a-f0-9]{24})/i) ||
    s.match(/[?&]id=([a-f0-9]{24})/i) ||
    s.match(/\/rooms?\/([a-f0-9]{24})(?![a-f0-9])/i);
  if (!m) return { ok: false, reason: 'no_id' };
  return { ok: true, roomId: m[1].toLowerCase() };
}

/** Einladung: ganzer Link (…/register/<code>) oder nur der Code – wie der Server (api_v1_public.ts) ihn annimmt. */
export function parseInvite(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/register\/([A-Za-z0-9_-]+)/);
  const code = m ? m[1] : s;
  return /^[A-Za-z0-9_-]{8,128}$/.test(code) ? code : null;
}

/** Benutzername für ein neues Konto (Server: 2–32 Zeichen, Buchstaben, Zahlen, . _ -). */
export function isNewUsername(s: string) {
  return /^[A-Za-z0-9._-]{2,32}$/.test(s.trim());
}

/** Highrise-Bot-Token (meist 64 Hex-Zeichen). Nur grob geprüft, damit Tippfehler (Leerzeichen, zu kurz) früh auffallen.
 *  Server: höchstens 200 Zeichen. */
export function isBotToken(s: string) {
  return /^[A-Za-z0-9_-]{32,200}$/.test(s.trim());
}

/** Highrise-Benutzername wie der Server ihn annimmt (api_v1.ts normUsername): ohne @, klein, 1–40 Zeichen [a-z0-9._-]. */
export function cleanUsername(s: string) {
  return s.trim().toLowerCase().replace(/^@/, '');
}
export function isUsername(s: string) {
  return /^[a-z0-9._-]{1,40}$/.test(cleanUsername(s));
}

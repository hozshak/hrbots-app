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
  const m =
    s.match(/ownedRoomId=([a-f0-9]{24})/i) ||
    s.match(/[?&]id=([a-f0-9]{24})/i) ||
    s.match(/\/rooms?\/([a-f0-9]{24})(?![a-f0-9])/i) ||
    s.match(/(?:^|[^a-f0-9])([a-f0-9]{24})(?![a-f0-9])/i);
  if (!m) return { ok: false, reason: 'no_id' };
  return { ok: true, roomId: m[1].toLowerCase() };
}

/** Highrise-Bot-Token (meist 64 Hex-Zeichen). Nur grob geprüft, damit Tippfehler (Leerzeichen, zu kurz) früh auffallen. */
export function isBotToken(s: string) {
  return /^[A-Za-z0-9_-]{32,}$/.test(s.trim());
}

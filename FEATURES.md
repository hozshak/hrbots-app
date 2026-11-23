# HR Bots – Feature-Inventar Webseite ↔ API ↔ App (Stand App 1.2.0, 23.11.2026)

Jede kundenseitige Funktion der Webseite (`highrise-manager/worker/src/routes/*.ts`, ohne admin.ts/*.bak) mit
API-Endpunkt (`/api/v1`, siehe `worker/API.md`) und App-Bildschirm. Status:

- **done** – in der App vorhanden (gleiche Server-Logik wie die Webseite)
- **not allowed (Apple)** – kostet Gold/Geld, zeigt Preise oder ist ein Kauf-/Aufladen-Hinweis (App Store 3.1.1 / 3.1.3(f)); bewusst weggelassen
- **not allowed (security)** – Geheimnisse (Bot-Token, Passwörter) zeigt die API nie (write-only); man kann sie in der App nur neu setzen
- **n/a** – gibt es auf der Webseite nicht / nur Server-intern

App-Pfade: `src/app/…` (Bildschirme), `src/components/pages/…` (Bot-Seiten). „Bot → Kachel“ = Bot-Menü `bot/[kind]/[id]`.

## 1. Konto, Anmeldung, Registrierung (auth.ts, register.ts, discord_link.ts, index.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| Login (`GET/POST /login`, Name egal Groß/klein, Passwort) | `POST /auth/login` (+ Drossel 10/15 min) | `login.tsx` | done |
| Logout (`POST /logout`) | `POST /auth/logout` | Konto → Abmelden | done |
| Sitzung bleibt (Cookie 90 Tage) | Token 180 Tage, SecureStore | `lib/session.ts` | done |
| Registrieren mit Einladungs-Link `GET /register/:token`: Kontingent (Welcome/Mod/Music), „1 Gratis-Welcome-Bot“ | **neu** `GET /auth/invite/:token` | **neu** `register.tsx` (Link einfügen/prüfen, Kacheln, Gratis-Hinweis; auch `hrbots://register?invite=…`) | done |
| `POST /register/:token`: Name, Passwort, AGB+Datenschutz akzeptieren, Discord aus Discord-Einladung, Fehler (vergeben, ungültig, Discord doppelt) | **neu** `POST /auth/register` (atomar, Drossel, 409 `username_taken`/`discord_taken`, 404 `invalid_invite`) | `register.tsx` (Passwort 2×, AGB-Schalter + Links, 16+-Hinweis), danach angemeldet | done |
| „Einladung anfragen“ (Startseite: @BBos / Discord) | – | Login: „Auf Discord nach einer Einladung fragen“ | done |
| Passwort ändern (`/me/password`, aktuelles + neu 2×, min. 4) | `POST /me/password` | `password.tsx` | done |
| Passwort vergessen | – | – | n/a (gibt es auf der Webseite nicht; Admin setzt zurück) |
| Konto löschen | `POST /me/delete` | `delete-account.tsx` | done (nur App; Webseite: „Admin fragen“) |
| Sprache EN/DE/AR (RTL) | (`lang` beim Chat) | Konto → Sprache (`language.tsx`), Auto = iPhone-Sprache | done |
| Discord-Pflicht (Gate auf allen Seiten) | 403 `discord_required` | Weiterleitung auf `discord.tsx` | done |
| Discord verbinden `/verify` → `/auth/discord` (OAuth) → Rücksprung | **neu** `POST /me/discord/web_link` (Einmal-Link, 5 min) + `GET /auth/web` (30-min-Websitzung) + schlanke Seiten `/auth/web/discord`, `/auth/web/done` (ohne Navigation/Preise) | `discord.tsx` + Konto-Zeile: öffnet Einmal-Link im In-App-Browser (kein zweites Anmelden), prüft nach dem Schließen selbst | done |
| Discord-Status („✅ verifiziert · @name“) | `GET /me/discord` | Konto → Discord | done |
| Discord-Server beitreten (Einladungslink) | `invite_url` | `discord.tsx` „Unserem Discord beitreten“ | done |
| Startseite `/` (Werbetext, Funktionen) | – | – | n/a (Marketing; Inhalte stecken in Hilfe/FAQ) |

## 2. Dashboard (dashboard.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| Bot-Karten (alle Arten): Name, Art, An/Aus, Restzeit, Gratis „🎁“ | `GET /bots` | Bots-Reiter `(tabs)/index.tsx` + `BotCard` | done |
| Start / Stop / Neustart je Karte | `POST /bots/:kind/:id/start|stop|restart` | großer AN/AUS-Knopf; Neustart unter Experten | done |
| Raum-Link „📍 room_id ↗“ (room_url oder high.rs/room?id=) | `room_url`, `room_id` | Bot-Menü **neu** „🚪 Zum Raum“ (öffnet Highrise) + Experten → Raum | done |
| „X/Y laufen“ (HUD-Ring) und Zähler je Art | `GET /bots` | **neu** „🟢 X von Y an“ über der Liste | done |
| Filter Alle/🤖/🛡️/🎵 | – (Client) | **neu** Filter-Reiter (nur bei mehreren Arten) | done |
| „+ Neu ▾“ je Art mit Limit („Limit erreicht“) | `GET /me` (limits/counts), `POST /bots` (403 `limit_reached`) | „Neu“-Assistent `new.tsx` | done |
| Leerer Zustand „Noch keine Bots“ | – | Leer-Ansicht mit „Bot machen“ | done |
| Gold-Chip „💰 N Gold“ | `GET /me/wallet` | Konto → Gold-Karte (nur ansehen) | done |
| Highrise-Chip („🔗 @name“ / „Verknüpfen →“) | `GET /me/link` | Konto → Gold-Karte / `link.tsx` | done |
| Discord-Banner/Chip | `GET /me/discord` | Konto → Discord / `discord.tsx` | done |
| „+ Aufladen“ / „🎮 Mieten“ / „💰 Rent“ statt Start | – | – | not allowed (Apple) – Kauf-Aufrufe; App sagt bei 402 nur „Keine Zeit übrig“ |
| Join/Leave-Log (`GET /presence/:kind/:id`, alle 20 s) | `GET /bots/:kind/:id/presence` | Bot → Aktivität → Besucher (alle 15 s) | done |

## 3. Welcome-Bot (bots.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| Anlegen: Name, Raum-Link/ID (Auto-Erkennung), Bot-Token, ≥2 Begrüßungen, Gratis-Bot aus Einladung | `POST /bots` | `new.tsx` (Schritt für Schritt, Vorlagen) | done |
| Anleitungen „Token holen“, „Raum-ID holen“, „{username}“-Hinweis, `-welcome`-Tipp | – (statisch) | „Zeig mir, wie“ (token, roomLink, messages) | done |
| Status, „PID nnn“, Position | `status`, **neu** `pid`, `settings.position` | Bot-Menü; PID unter Experten → Bot-Meldungen | done |
| Designer-Hinweis | – | Hilfe-Anleitung „Bot in den Raum lassen“ + Beheben-Blatt | done |
| Runtime JS/Python + Erklärung | `PATCH … {engine}` | Experten → Bot-Motor | done |
| Logs (Aktualisieren, Auto 5 s, Farben) | `GET /bots/welcome/:id/logs` | Experten → Bot-Meldungen (Auto 5 s, Fehler rot) | done |
| Admins hinzufügen/entfernen | `POST/DELETE …/admins` | Bot → Helfer | done |
| Positions-Tracking: hinzufügen, an/aus, löschen | `…/tracking` | Bot → Beobachten | done |
| Begrüßungen: allgemein/persönlich, an/aus, bearbeiten, löschen, hinzufügen | `…/messages` | Bot → Was er sagt | done |
| Admin-Chatbefehle (`-welcome`, `-posuser`, `-stoppos`, `-posbot`, `H @user`) | – | Hilfe → Chat-Wörter (mit „Wer darf das?“), Bot → Hilfe | done |
| Bearbeiten: Name, Raum-ID, Raum-Link, Position x/y/z, Blickrichtung | `PATCH /bots/welcome/:id` | Experten → Name / Raum / Platz; Bot → Wo er steht (Richtung) | done (Raum-ID + Link über ein Feld: Link einfügen setzt beides) |
| Bot-Token im Bearbeiten-Formular **anzeigen** | nur `bot_token_set` | Experten → Schlüssel ersetzen | not allowed (security) – nur neu setzen |
| Löschen | `DELETE /bots/welcome/:id` (stoppt + räumt auf) | Experten → Bot löschen | done |
| Restzeit läuft live | `runtime.seconds_left` | Restzeit-Anzeige (zählt herunter) | done |

## 4. Mod-Bot (mod_bots.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| Anlegen (Name, Raum, Token, Owner) + Anleitungen (Designer **und** Moderator-Rechte) | `POST /bots` | `new.tsx` | done |
| Kopf: Online/Offline, Engine-Badge, „Open room“, Start/Stop/Neustart | `GET /bots/mod/:id`, power | Bot-Menü (Zum Raum, AN/AUS), Experten | done |
| Übersicht: Zahlen VIPs/Zonen/Orte/Gäste/Wörter | `settings.*` | Zahlen auf den Kacheln | done |
| Übersicht: Gold des Bots (`wallet_gold`, „!wallet“) | `settings.wallet` | **neu** Bot → Aktivität: „🪙 Gold des Bots“ (nur Anzeige) | done |
| Letzte Aktivität (Join/Leave) | `…/presence` | Bot → Aktivität → Besucher | done |
| Position x/y/z/Richtung | `PATCH {position}` | Wo er steht / Experten → Platz | done |
| Verbindung: Raum-ID, Raum-Link, Token (Neustart) | `PATCH {room, bot_token}` | Experten → Raum / Schlüssel | done (Token anzeigen: not allowed (security)) |
| Runtime JS/Python | `PATCH {engine}` | Experten → Bot-Motor | done |
| Owner setzen | `PATCH {owner_username}` | Bot → Helfer → Chef | done |
| Rollen Admin/Moderator/VIP (+ Erklärungen) | `…/roles` | Bot → Helfer (Reiter je Rolle) | done |
| Befehlsnamen !go / !tp | `PUT …/commands` | Experten → Chat-Wörter für Orte | done |
| Schnellreferenz Chatbefehle | – | Hilfe → Chat-Wörter (alle 25 mit Rolle) | done |
| Löschen | `DELETE` | Experten | done |
| Verwarnungen (Zahl/3, löschen) | `…/warns` | Bot → Regeln → Verwarnt | done |
| Stummgeschaltete (aufheben) | `…/mutes` | Regeln → Stumm | done |
| Gebannte (nur Anzahl) | `…/bans` | Regeln → Meldungen (Hinweis „N gesperrt“) | done (Webseite zeigt auch nur die Zahl) |
| Meldungen (Liste, schließen) | `…/reports` | Regeln → Meldungen | done |
| Böse Wörter + Aktion (warn/mute/kick/ban), löschen | `…/banned_words` | Regeln → Wörter | done |
| Begrüßungen (an/aus, löschen, hinzufügen) | `…/welcomes` | Bot → Was er sagt (auch bearbeiten) | done |
| Teleport-Ziele (Name, x/y/z, ab Rolle), löschen | `…/destinations` | Bot → Orte → Plätze | done |
| VIP-Preis (Gold-Trinkgeld der Gäste) | `PUT …/vip {price}` | – | not allowed (Apple) – Gold-Preis |
| VIP-Sicherheitspunkt (`!setvipsafe`) | `PUT …/vip {safe_spot}` | Experten → VIP-Rauswurf-Punkt | done |
| VIP-Zonen (Mitte + Radius), löschen | `…/vip_zones` | Bot → Orte → VIP | done |
| Outfit-Wechsel an/aus + Minuten | `PUT …/outfit_settings` | Bot → Aussehen | done |
| Outfits: Liste, hinzufügen (Item-Codes), löschen, alle löschen | `…/outfits` | Aussehen + Experten → Outfit-Codes (**neu** Prüfung ≤ 50 Teile) | done |
| Gästeliste (`!tip1`) | `…/guests` | Aktivität → Gäste | done |
| Positions-Tracking (Namen) | `…/tracking` | Aktivität → Beobachten | done |
| Mod-Log (letzte 50) | `…/mod_logs` | Aktivität → Wächter-Log | done |
| Bot-Logs (Auto 5 s, Farben) | `…/logs` | Experten → Bot-Meldungen | done |

## 5. Music-Bot / DJ (music_bots.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| Anlegen (+ inklusives Radio, optional eigener Icecast) + Anleitungen | `POST /bots` (Radio automatisch); eigener Server danach `PUT …/icecast` | `new.tsx`; Experten → Radio-Stream | done |
| Kopf: Owner, Status, Restzeit (Countdown), Start/Stop/Neustart, Löschen | `GET`, power, `DELETE` | Bot-Menü / Experten | done |
| „💰 Mehr Zeit mieten“ | – | – | not allowed (Apple) |
| Live: Player für den Stream | `settings.stream_url` | **neu** Musik-Seite → „🎧 Hier anhören“ (expo-audio) | done |
| Live: Play / Play Top (Lied/URL), Skip, Liste leeren, Autoplay an/aus | `POST …/command` | Bot → Musik | done (+ Lauter/Leiser, die die Webseite nicht als Knopf hat) |
| Letzte Befehle (Status, Ergebnis, alle 7 s) | `GET …/commands` | Aktivität → Musik-Log (alle 10 s) | done |
| Jetzt läuft / Warteschlange / Verlauf | – (Webseite zeigt es auch nicht; nur im Raum `-np`, `-q`) | Hilfe → Chat-Wörter `-np`, `-queue` | n/a (keine Datenquelle) |
| Rollen Mod/DJ/VIP (+ Erklärungen) | `…/roles` | Bot → Helfer | done |
| Tickets: Liste, geben/nehmen | `…/tickets` | Bot → Tickets | done |
| Ticket-Preis „3.3 Gold = 1 Ticket“ / Gold pro Ticket einstellen | `PUT …/settings {gold_per_ticket}` | – | not allowed (Apple) – Gold-Preis |
| Blockierte (Liste, hinzufügen, entfernen) | `…/blocked` | Bot → Helfer → Gesperrt | done |
| Icecast-Formular (Host, Port, User, Passwort, Mount) | `PUT …/icecast` (**neu**: Hörer-Link passt sich an) | Experten → Radio-Stream → Eigener Server | done |
| Icecast-Passwort im Formular anzeigen | nur `password_set` | – | not allowed (security) |
| Max. Liedlänge, Autoplay an/aus | `PUT …/settings` | Experten → Liedlänge; Musik → Weiterspielen | done |
| Ansagen (Zeilen, Intervall) | `PUT …/announcements` | Bot → Was er sagt | done |
| Autoplay-Lieder: Liste „n/20“, Größe, löschen | `GET/DELETE …/autoplay` | Experten → Meine Lieder („n von 20“) | done |
| Autoplay-Lieder **hochladen** (.mp3, ≤ 10 MB, max. 20) | `POST …/autoplay` (multipart `file`) | **neu** Experten → Meine Lieder → „Lied hinzufügen (.mp3)“ (expo-document-picker) | done |
| Runtime, Position, Zugangsdaten (Name, Raum, Link, Token, Owner) | `PATCH` | Experten / Helfer → Chef | done (Token anzeigen: not allowed (security)) |
| Befehls-Tab (alle Chatbefehle mit Rollen, DM `sub`) | – | Hilfe → Chat-Wörter → DJ (20 Einträge, ohne Gold-Beträge) | done |
| Gold des Bots (`-musicwallet`) | `settings.wallet` | **neu** Aktivität → „🪙 Gold des Bots“ | done |
| Logs + Join/Leave | `…/logs`, `…/presence` | Experten / Aktivität | done |

## 6. Radio (radio.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| Liste der Stationen (inkl./aktiv bis/abgelaufen/Admin-frei) | `GET /radio` | Konto → Meine Radios (`radios.tsx`) | done |
| Live-Status „● LIVE · N Zuhörer“ (alle 15 s) | `GET /radio/:id/status` | Radios (alle 15 s) | done |
| Player (Play/Pause, neu verbinden) | `stream_url` | **neu** „🎧 Hier anhören“ je aktiver Station | done |
| Server, Port, Mount, Benutzer, Hörer-URL kopieren | `station.source`, `stream_url` | Radios → Details / Hör-Link kopieren | done |
| Source-Passwort anzeigen, Source-URL mit Passwort | nur `password_set` | – | not allowed (security) |
| In Music-Bot übertragen | `POST /radio/:id/sync` | Radios → Mit DJ verbinden | done |
| Abgelaufene löschen | `DELETE /radio/:id` | Radios → Radio löschen | done |
| Neue Station kaufen (2000 Gold), Verlängern, Preis, PayPal, „Gold aufladen“-Hinweis, Kauf-Limit | – | – | not allowed (Apple) |

## 7. Wallet / Mieten (wallet.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| Gold-Guthaben | `GET /me/wallet` | Konto → Gold-Karte | done (nur ansehen) |
| Letzte 20 Buchungen | `transactions` | Gold-Karte → Verlauf | done |
| Highrise verknüpfen (Code aus Bank-Raum, geparktes Trinkgeld) | `GET/POST /me/link` | `link.tsx` (Raum öffnen, Code eingeben) | done |
| „💳 Gold aufladen“ (Bank-Raum, Trinkgeld) | – | – | not allowed (Apple) – Aufladen-Aufruf |
| PayPal (Freunde) | – | – | not allowed (Apple) |
| Aktive Abos (Bot / Plan / Ablauf) + „Weiteren Bot mieten“ | – | Restzeit steht an jedem Bot | not allowed (Apple) – Plan-/Kaufliste; die Restzeit selbst ist done |
| `/me/rent`: Preistabellen, Plan wählen, mit Gold bezahlen | – (nur Bank-Bot im Highrise-Chat) | – | not allowed (Apple) |

## 8. Support-Tickets (tickets.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| Liste (Betreff, #, Datum, Status offen/beantwortet/geschlossen) | `GET /me/tickets` | Konto → Nachrichten an unser Team (`tickets/index.tsx`) | done |
| „Neue Antwort“-Hinweis | (Status `answered`) | **neu** Konto-Zeile „🔔 1 neue Antwort“ | done (Webseite hat keinen Zähler) |
| Neu: Betreff, Bot (Welcome/Mod), Text 10–4000, **Bild (Screenshot)** | `POST /me/tickets {image}` | `tickets/new.tsx` + **neu** „Bild dazutun“ (expo-image-picker, verkleinert, ≤ 800 000 Zeichen) | done |
| Verlauf mit Admin-Antworten **und Bildern** (antippen = groß) | `GET /me/tickets/:id` | `tickets/[id].tsx` **neu** Bilder + Vollbild | done |
| Antworten (2–4000) mit Bild | `POST …/replies {image}` | **neu** Bild-Knopf im Antwortfeld | done |
| Max. 5 offene Tickets | 403 `limit_reached` | Fehlermeldung | done |
| Geschlossen → „neues Ticket“ | 409 `ticket_closed` | Hinweis „Das ist erledigt“ | done |

## 9. Hilfe, KI-Chat, Anleitungen (chat.ts, howto.ts, site_kb.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| KI-Hilfe-Chat (Tageslimit, Hinweis auf Ticket) | `POST /chat` | `chat.tsx` | done |
| KI-Chat mit **Bild** (📎) | `POST /chat {image}` | **neu** Bild-Knopf im Chat | done |
| Vorschlags-Chips (u. a. „Was kostet…“, „Gold aufladen“) | – | eigene Vorschläge ohne Preise | done (Preis-Chips: not allowed (Apple)) |
| KI nennt Preise/PayPal (Wissensbasis) | **neu** `APP_CHAT_RULES` für API-Anfragen | – | done (App-KI nennt keine Preise) |
| How-To 1 Registrieren · 2 Login · 3 Passwort · 4 Highrise verknüpfen | – (statisch) | Hilfe → „Zeig mir, wie“ (register, password, link) + FAQ | done |
| How-To 5 Gold aufladen · 8 Zeit mieten | – | – | not allowed (Apple) |
| How-To 6/7/13 Bots anlegen (ohne Preise) | – | Anleitungen newBot, token, designer, roomLink, djSongs, radio | done |
| How-To 9 Start/Stop/Neustart | – | Anleitung startStop | done |
| How-To 10/11/12/14 Chatbefehle Welcome/Mod/Bank/Music mit Rollen | – | Hilfe → Chat-Wörter (4 Reiter inkl. „Verknüpf-Helfer“, Rollen-Plakette, Suche) | done |
| FAQ: Bot stoppt (Guthaben → aufladen) / kein Gold nach Trinkgeld | – | – | not allowed (Apple) – Aufladen-Hinweise |
| FAQ: Raum ändern, Welcome vs. Mod, Bot-Admin, offline mit Restzeit | – | Hilfe → Fragen (+ App-eigene Fragen) | done |
| Discord-Support | – | Hilfe → „Auf Discord fragen“ | done |

## 10. Rechtliches, Rahmen (legal.ts, shell.ts)

| Webseiten-Funktion | API | App | Status |
|---|---|---|---|
| AGB, Datenschutz, Impressum (EN/DE/AR) | – (Seiten mit **neu** `?lang=`) | Konto → Rechtliches öffnet die Seite in App-Sprache (In-App-Browser); Registrieren verlinkt AGB+Datenschutz | done |
| Navigation (Übersicht, Wallet, Mieten, Radio, Tickets, Hilfe, Passwort, AGB, Abmelden) | – | Reiter Bots · Hilfe · Konto | done (Mieten: not allowed (Apple)) |
| Benachrichtigungen/Badges | – (Webseite hat keine) | Ticket-Hinweis im Konto | done |
| 404/Fehlerseiten | JSON-Fehler | Fehlertexte EN/DE/AR | done |

## Abgleich App ↔ echter Server (behoben in 1.2.0)

- Raum-Links: App nahm mehr Formen an als der Server (z. B. `highrise.game/en/room/<id>`) → Server (`bots_core.parseRoomInput`) nimmt jetzt `/room/<id>` an, App nur noch genau die Server-Formen.
- Konto-Reiter ohne Discord lud `/me/wallet` → 403-Fehlerkarte; jetzt erst nach Discord.
- Discord-Link brauchte ein zweites Web-Login → Einmal-Link.
- Icecast speichern ließ den alten Hörer-Link (inkl. Radio) stehen → Server setzt ihn bei Server-Wechsel neu.
- Musik-Befehle aus der App tragen den Kontonamen (`requested_by`) → App blendet den eigenen Namen aus.
- Chat schickte Fehler-Blasen/sehr lange Antworten mit → gefiltert/gekürzt.
- Outfits > 50 Teile wurden erst vom Server abgelehnt → App prüft vorher.
- Mock spiegelt jetzt: inklusives Radio beim DJ-Anlegen, Befehlsverlauf, Bild-Anhänge, Radio-Status, Löschen inkl. Radio/Tickets, Chat-Prüfungen, Registrierung, Einmal-Link, Upload, PID.

## Bewusst nicht in der App – Begründung

- **Apple 3.1.1 / 3.1.3(f):** Mieten/Verlängern (Bots, Radio), Preistabellen, PayPal, „Gold aufladen“/„Trinkgeld an Bank-Bot“, Abo-Pläne,
  VIP-Preis in Gold, Gold pro Song-Ticket, Kauf-FAQ/How-To-Abschnitte 5 und 8. Gold-Guthaben, Verlauf und das Gold *des Bots* sind nur Anzeige.
- **Sicherheit (write-only):** Bot-Token, Icecast-Passwort, Radio-Source-Passwort werden nie ausgeliefert; die Webseite zeigt sie im Formular.
- **Gibt es nirgends:** Passwort vergessen, Jetzt-läuft/Warteschlange des DJs (nur im Raum per `-np`/`-q`), Ban-Liste (nur Anzahl).

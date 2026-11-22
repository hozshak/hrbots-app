# HR Bots – iPhone-App (Expo)

Begleit-App zu **highrise-bots.com**: angemeldete Nutzer legen ihre Highrise-Bots an, richten sie ein und schalten sie ein/aus.
Technik wie bei Asoo (`D:\SL\claude\asoo-app`): Expo SDK 58, expo-router, React Native 0.88.1, TypeScript.
API-Vertrag: `D:\SL\claude\highrise-manager\worker\API.md` (Basis `https://highrise-bots.com/api/v1`, Bearer-Token).

**App-Store-Regeln (3.1.3(f))**: keine Preise, kein „Kaufen/Mieten/Upgrade“, kein Hinweis zum Bezahlen woanders. Laufzeit nur neutral
(„noch 2 Std. 13 Min.“, „Unbegrenzt“, „Keine Laufzeit übrig“). Keine Registrierung in der App. Konto löschen: Konto → Konto löschen.
Bot-Token wird nach dem Speichern nie angezeigt („Schlüssel gespeichert“).

## Aufbau (ab 1.1.0: „so einfach, dass Kinder es können“)
- **Design wie die Webseite** („Neon Grid“, `worker/src/lib/theme.ts`): Farben/Radien in `src/lib/theme.ts`, Überschriften
  `Syne` (@expo-google-fonts/syne), Zahlen/Code `DM Mono` (@expo-google-fonts/dm-mono), Haupt-Knöpfe Verlauf Cyan→Lime mit Leuchten.
- **Sicherer Bereich**: jede Seite nutzt `<Screen>` (`src/components/ui.tsx`) – Kopfzeile in `SafeAreaView` (nie unter Statusleiste/
  Dynamic Island), eigene Kopfzeilen statt der System-Kopfzeile, feste untere Leiste.
- **Sprachen** Englisch/Deutsch/Arabisch (`src/lib/lang/*.ts`, Hilfetexte in `src/lib/content.ts`). Konto → Sprache: Automatisch /
  Deutsch / English / العربية, gespeichert in SecureStore (Web: localStorage), wirkt sofort. Arabisch spiegelt per `direction: 'rtl'`
  an der Wurzel (kein `I18nManager.forceRTL`, kein Neustart nötig); Pfeile werden mitgespiegelt.
- `src/api/` – `types.ts`, `client.ts` (je Endpunkt eine Funktion, Formen genau nach API.md Stand 23.11.2026), `transport.ts`, `mock.ts`.
- `src/app/` – `(tabs)/` **Bots · Hilfe · Konto**; `new` (Assistent, eine Frage pro Seite); `bot/[kind]/[id]/index` (Bot-Menü:
  AN/AUS + große Kacheln) und `bot/[kind]/[id]/[page]` (eine Aufgabe pro Seite: say, helpers, watch, rules, places, look, music,
  tickets, stand, activity, help, **expert**); `language`, `password`, `link` (Highrise verbinden), `radios`, `tickets/…`
  (Nachrichten ans Team), `chat` (Hilfe-Roboter), `delete-account`, `login`, `discord`.
- `src/components/` – `ui.tsx` (Bausteine), `BotCard.tsx` (AN/AUS-Knopf, Restzeit-Balken), `editors.tsx` (Listen mit „+“/Mülleimer),
  `pages/*` (Inhalte der Bot-Seiten), `FixItSheet.tsx`, `guide.tsx` („Zeig mir, wie“).
- Alles Technische (Koordinaten, Logs, Outfit-Codes, Icecast, Chat-Wörter, Raum/Schlüssel, Bot-Motor) liegt unter „Experten-Einstellungen“.

**Gold**: Konto zeigt „Mein Gold“ nur zum Ansehen (GET /me/wallet) + Verlauf in einfachen Worten. Kein Kaufen/Mieten/Verlängern,
keine Preise, kein Hinweis, wo man kauft. Gold-Felder der API (mod `vip.price`, `wallet`, music `gold_per_ticket`) werden nie gezeigt/gesendet.

## Gegen einen lokalen Server testen
Server: im Ordner `highrise-manager/worker` `npx wrangler dev --local --port 8788 --test-scheduled --var AGENT_URL:http://127.0.0.1:9 --var AGENT_SECRET:local-test`.
App: `EXPO_PUBLIC_API_BASE=http://127.0.0.1:8788/api/v1 npx expo start --web --port 8096` (Standard ohne Variable: `https://highrise-bots.com/api/v1`).
Die API erlaubt CORS (`*`), daher klappt die Web-Vorschau direkt.

## Im Browser testen (ohne Server, MOCK)
```
npm install
npm run mock          # = EXPO_PUBLIC_API_MOCK=1 npx expo start --web --port 8095
```
Dann http://localhost:8095 öffnen (oder in Claude die Vorschau `hrbots-app-web` aus `D:\SL\claude\.claude\launch.json`).
Anmelden mit beliebigem Namen und Passwort. Besondere Testfälle im Mock:
- Passwort `wrong` → „falsches Passwort“ (Anmelden und Konto löschen)
- Benutzer `nodiscord` → Discord-Seite; `disabled` → Konto gesperrt
- Bot „Party Welcome“ → keine Laufzeit; „Chill Radio“ → 1. Start: Server antwortet nicht, 2. Start: stürzt ab (Beheben-Blatt), 3. klappt
- Raum-ID `000000000000000000000000` → ungültiger Raum
- Highrise verbinden: Code `ABC234` klappt, `USED00` = schon benutzt, `TAKEN0` = anderes Konto; Passwort ändern: altes `wrong` = falsch

Sprache testen: in der App Konto → Sprache, oder `EXPO_PUBLIC_LANG=de|en|ar` setzt die Geräte-Sprache für „Automatisch“. Prüfen: `npm run typecheck`.
Hinweis: Einfügen aus der Zwischenablage geht im Browser-Test meist nicht (Browser-Erlaubnis), am iPhone schon.

## Bauen (wie Asoo)
GitHub Actions auf einem Mac (`.github/workflows/ios-build.yml`, „Run workflow“) baut mit `eas build --local` und lädt zu TestFlight hoch.
Version/Build-Nummer zählt bei Expo weiter (`appVersionSource: remote`). Kennung `de.feierabendcode.hrbots`, Team 844JD2257D, Expo-Konto `en0o0n`.

## Offen (TODO)
1. **Expo-Projekt anlegen**: `npx eas init` im Ordner (schreibt `extra.eas.projectId` in `app.json`).
2. **App Store Connect**: App „HR Bots“ mit Kennung `de.feierabendcode.hrbots` anlegen; die Apple-ID der App in
   `.github/workflows/ios-build.yml` (`ASC_APP_ID`, jetzt `TODO_ASC_APP_ID`) und in `eas.json` (`ascAppId`) eintragen.
3. **GitHub-Repo** anlegen, pushen, Secrets setzen: `EXPO_TOKEN` (Expo-Konto en0o0n) und `ASC_API_KEY_P8` (Schlüssel DNMHB7CB28 wie bei Asoo).
4. **App-Symbol**: jetzt ein Platzhalter (`scripts/make-icon.py` → `assets/images/icon.png` 1024×1024 und `splash-icon.png`). Für die
   Veröffentlichung ein richtiges Symbol einsetzen.
5. **Server**: API v1 ist live und lokal mit der App getestet; CORS-Änderung muss noch deployt werden, dann in der App ohne MOCK gegen highrise-bots.com testen.
6. App-Store-Texte, Datenschutz-Angaben und Screenshots.

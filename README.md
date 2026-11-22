# HR Bots – iPhone-App (Expo)

Begleit-App zu **highrise-bots.com**: angemeldete Nutzer legen ihre Highrise-Bots an, richten sie ein und schalten sie ein/aus.
Technik wie bei Asoo (`D:\SL\claude\asoo-app`): Expo SDK 58, expo-router, React Native 0.88.1, TypeScript.
API-Vertrag: `D:\SL\claude\highrise-manager\worker\API.md` (Basis `https://highrise-bots.com/api/v1`, Bearer-Token).

**App-Store-Regeln (3.1.3(f))**: keine Preise, kein „Kaufen/Mieten/Upgrade“, kein Hinweis zum Bezahlen woanders. Laufzeit nur neutral
(„noch 2 Std. 13 Min.“, „Unbegrenzt“, „Keine Laufzeit übrig“). Keine Registrierung in der App. Konto löschen: Konto → Konto löschen.
Bot-Token wird nach dem Speichern nie angezeigt („Schlüssel gespeichert“).

## Aufbau
- `src/api/` – `types.ts` (Datentypen), `client.ts` (je Endpunkt eine Funktion), `transport.ts` (fetch + Token in SecureStore,
  Fehler nach `error`-Code), `mock.ts` (Test-Server im Speicher), `room.ts` (Raum-Link/ID prüfen)
- `src/app/` – Bildschirme: `login`, `discord` (Discord-Pflicht), `(tabs)/` mit **Bots · Hilfe · Konto**, `new` (geführter Assistent),
  `bot/[kind]/[id]` (Statuskarte mit Schalter, aufklappbare Abschnitte, „Erweitert“, Löschen), `delete-account`
- `src/components/` – Oberfläche (`ui.tsx`), Bot-Karte, „Beheben“-Blatt (`FixItSheet.tsx`), Anleitungen (`guide.tsx`), Einstellungen je Bot-Art (`detail/`)
- `src/lib/` – Sprache (`i18n.ts`, Englisch + Deutsch nach Gerätesprache), Hilfetexte/Befehle/Vorlagen (`content.ts`), Daten-Cache und
  Start/Stopp mit Nachfragen (`query.ts`), Anmeldung (`session.ts`), Farben (`theme.ts`)

Die Typen in `src/api/types.ts` und der Mock (`src/api/mock.ts`) sind genau mit dem Server-Code abgeglichen
(`worker/src/routes/api_v1.ts`; Formen auch in API.md).

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

Sprache testen: `EXPO_PUBLIC_LANG=de` erzwingt Deutsch. Prüfen: `npm run typecheck`.
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

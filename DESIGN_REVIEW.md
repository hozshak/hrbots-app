# HR Bots – Design-Prüfung (App 1.3.0, 24.11.2026)

Geprüft in der Web-Vorschau mit Test-Daten (`EXPO_PUBLIC_API_MOCK=1`) auf **375×667** (iPhone SE) und **390×844**, in **Englisch, Deutsch und
Arabisch (RTL)**. Seiten: Anmelden, Registrieren, Discord, Bots, Bot-Seite (Begrüßer/Wächter/DJ) mit allen Kacheln (Was er sagt, Helfer,
Beobachten, Regeln, Orte, Aussehen, Musik, Tickets, Wo er steht, Aktivität, Hilfe, Experten), Assistent „Neuer Bot“ (alle Schritte + Fertig),
Hilfe (Suche, Fragen, Anleitungen, Chat-Wörter), Hilfe-Roboter, Konto, Sprache, Passwort, Highrise verbinden, Meine Radios, Nachrichten ans Team
(Liste, neu, Verlauf), Konto löschen, „Lass es uns beheben“-Blatt.

Jede Zeile: **gefunden → behoben**.

## Auswahl, Schalter, Knöpfe
- Blickrichtung: Reihenfolge passte nicht zu den Pfeilen (↘ links, ↙ rechts) und wurde bei Arabisch gespiegelt → 2×2-Pfeil-Raster wie der Raum (oben = hinten), nie gespiegelt, Bot in der Mitte, Wörter unter den Pfeilen, keine Codes wie „FrontRight“.
- Kachel „Experten-Einstellungen“ war riesig hoch (`flexBasis: 100%` in einer Spalte = Höhe) → volle Breite über `width`.
- Outfit-Wechsel (5/10/30/60 Min.) und Ansage-Intervall (1–60 Min.): eigene Werte der Webseite (z. B. 15 Min., 120 s) nicht wählbar, dann war gar nichts markiert → „✏️ Andere“ mit Zahlenfeld, zeigt den eigenen Wert („✏️ 15 Min.“).
- „Andere“ mit eigenem Emoji machte die Zeile höher als die anderen → Stift im Text, alle Knöpfe gleich hoch.
- Sprachwahl mit Länderflaggen (🇸🇦 für Arabisch; im Browser nur „DE/GB/SA“) → neutrale Sprach-Abzeichen DE / EN / ع.
- Radio-Server „Sichern“ immer sichtbar (speicherte auch ohne Änderung) → nur bei Änderung.
- VIP-Rückkehr-Platz: „Sichern“ immer sichtbar, Entfernen unmöglich → nur bei Änderung + „Platz entfernen“.
- Begrüßung mit „Nur für @…“ zeigte „Pausiert“ nicht mehr → beides („Nur für @bbos · Pausiert“).
- Orte/VIP-Bereiche verlangten gleich x/y/z-Zahlen → „Platz vom Bot nehmen“ zuerst + „✅ Stelle gewählt“, Zahlen nur unter „Zahlen eintippen (Experten)“.
- Nach „Bot machen“ kein Weg zum Platz → Knopf „📍 Platz für den Bot aussuchen“.

## Eingabefelder
- „Einfügen“-Knopf im Raum-Feld rechts abgeschnitten (Textfeld schrumpfte nicht) → `minWidth: 0`.
- Doppelte Beschriftung („Bot-Name“ als Klappe und als Feld, „Dein Raum“ zweimal) → Feld ohne Doppel bzw. „Raum-Link“.
- Links, Schlüssel, Codes, Zahlen, Highrise-Namen, Passwörter liefen bei Arabisch rechtsbündig/von rechts → `Field ltr` (immer links→rechts).
- Koordinaten: Tastatur mit Satzzeichen, keine Grenzen, keine Meldung → Komma-Zahlentastatur, Prüfung X/Z 0–200 und Höhe 0–100, roter Rand + eine Meldung unter der Zeile, Erklärung was X/Y/Z bedeuten.
- Chat-Wörter für Orte: Leerzeichen erlaubt (Server lehnt ab) → Prüfung + Meldung, Platzhalter `!go`/`!tp`, Hinweis „leer = normale Wörter“.
- Radio-Server: Port ohne Fehlermeldung, nötiges Passwort nicht erklärt, keine Längen-Grenzen → Meldung, Hinweis, Grenzen, Beispiel-Platzhalter.
- Outfit-Name mit englischem Platzhalter „Party“ → übersetzt; Teile-Zähler unter dem Codes-Feld.
- Betreff/Text an das Team, Antworten, Hilfe-Roboter: Autokorrektur aus → an (Sätze); Namen/Codes/Schlüssel bleiben ohne Autokorrektur/Großschreibung.
- Code-Feld „Highrise verbinden“: kein Autofill → `oneTimeCode`.
- Alle Formular-Seiten: KeyboardAvoidingView (Screen `keyboard`) + Scrollen geprüft – nichts liegt unter der Tastatur.

## Texte
- „1 people are banned.“ / „1 tickets“ → Einzahl-Texte.
- Platzhalter für Highrise-Namen war in allen Sprachen „name“ → „z. B. mila_x“ / „مثلًا: mila_x“.
- Arabisch „Mount“ unübersetzt → „نقطة البث (Mount)“; EN/DE „Mount“ → „Mount point“/„Mountpoint“.
- Arabisch Outfit mal „ملابس“, mal „لبس“ → einheitlich „زيّ / أزياء“.
- Arabisch „تم وضع علامة: انتهى“ holprig → „تمت المعالجة ✓“.
- Reiter „Guard did“ / „Wächter hat“ (halber Satz) → „Guard log“ / „Wächter-Verlauf“ / „سجل الحارس“.
- Wächter-Log zeigte „@bot“ → „🤖 Der Bot“.
- Chat-Wörter: „Owner“ statt „Boss“, „Moderator+“ statt „Mods“ → „Boss“/„Chef“/„الزعيم“, „Mod+“.
- EN-Hinweis zum Verbindungs-Raum nannte eine Zeile, die es nicht gibt → „Link your Highrise account“; DE „Verknüpf-Helfer“ → „Verbindungs-Helfer“.
- Arabisch Discord-Schritt 2 mit englischem Knopfnamen, die Webseite zeigt „اربط مع Discord“ → angepasst.
- Passwort-Hinweis EN mal „letters“, mal „characters“ → „letters or numbers“.
- EN „Up to 50 items“ statt „pieces“ → „pieces“.
- DE „Bild dazutun“, „Verbinde…“, Auslassungspunkte uneinheitlich → „Bild hinzufügen“, „Verbindet …“, „Wird hochgeladen … bitte warten“.
- DE „Noch niemand da gewesen“ → „Noch niemand gekommen“.
- Anleitung „Neuen Bot machen“: Schlüssel vor Raum (App fragt umgekehrt) und „Bot ist noch aus“ (App schaltet ihn an) → richtige Reihenfolge, richtiger Satz (EN/DE/AR).
- Anleitung „Zahlen einer Stelle“ schickte zu `!posbot` (nur Wächter, wird nicht gespeichert) → „Bot zu mir holen“ / `-here`.
- `!posbot` hieß „bleibt da“, wird aber nicht gespeichert → „(nur bis zum Neustart)“; neues Chat-Wort `-here` bei allen drei Bot-Arten.
- „Gold the bot has“ versteckt in „Aktivität“ → Kachel „🪙 Bot-Gold: 6 · aktualisiert vor 3 Min.“ auf der Bot-Seite.
- „-musicwallet“ brach am Bindestrich um → geschützter Bindestrich.
- Verbindungs-Code „mit 6 Buchstaben“, enthält aber Zahlen → „6 letters and numbers“.
- Arabisch „صاحب الغرفة“ vs. „الزعيم“ für den Chef → einheitlich „الزعيم“.
- Hilfe-Suche: gefundene Fragen/Anleitungen blieben zu; Chat-Wort-Treffer ohne Bot-Art → aufgeklappt + Überschrift je Bot-Art.
- Test-Daten: DJ-Ansagen mit `!play`/`!skip` (DJ nutzt `-play`/`-skip`) → korrigiert.
- Ungenutzte Texte entfernt (`login.noAccount`, `botgold.hint`, `botgold.none`, `say.everyNow`, `stand.sub`, `stand.exact`).

## Arabisch / RTL
- „@name“ erschien als „name@“ (Helfer, Beobachten, Besucher, Verwarnt, Gäste, Tickets, Konto) → unsichtbare Links→rechts-Marke (`at()`).
- Englischer Nutzer-Text in arabischer Oberfläche mit Satzzeichen am falschen Ende („.into my room“) in Team-/Roboter-Blasen, Nachrichten, Bot-Namen → Schreibrichtung nach Inhalt (`Txt auto`: iOS `writingDirection: auto`, Web `dir="auto"`).
- Namenszeile über der eigenen Blase zeigte bei Arabisch zur falschen Seite → folgt der Blase.
- Zahlen-Zeilen (X/Y/Z, Port/Mount, Chat-Wörter) wurden gespiegelt → bleiben links→rechts.

## Farben, Kontrast, Tippflächen
- Weiße Ziffern auf Cyan (Anleitungs-Schritte, Beheben-Blatt) schlecht lesbar → dunkle Schrift `onAccent`.
- Abspiel-Knopf: weißes ▶️-Emoji auf Cyan → Symbol Play/Stopp in Theme-Farben.
- Feste Farben außerhalb des Themes (`#fff`, `#000`, `#1a1203`, alte rgba-Töne bei Karten-Rändern/Knöpfen/Toast/Blatt-Griff, Kachel-Farben `#7c8cff`…) → Theme (`alpha()`, `C.white`, `C.logBg`, `C.toastBg`, `PAGE_TINT`).
- Runde Symbol-Knöpfe (z. B. „−“ bei Tickets) fast unsichtbar auf Karten → `C.elevated`.
- Sprach-Knopf beim Anmelden: Text „🌍“ als VoiceOver-Name → Symbol-Knopf „Sprache“, 48 pt.
- Tippflächen geprüft: Knöpfe 48/60 pt, Symbol-Knöpfe 48, Reiter 48, Auswahl 56, Richtungs-Pfeile 104, Zeilen ≥ 64 → alle ≥ 44 pt.

## Sonstiges
- „Highrise verbinden“ öffnete den Raum als Webseite statt in Highrise → `openRoom` (Highrise-App); doppelte Überschrift unter dem Knopf entfernt.
- Konto-Fußzeile zeigte im Browser „Version 1.0.0“ → Version aus `app.json`.
- „Wo er steht“: Meldung „Bot ist aus“ blieb nach dem Einschalten stehen → verschwindet von selbst.
- Leer-, Lade- und Fehler-Zustände auf allen Listen geprüft (Empty/Loading/ErrorState vorhanden).

## Bewusst gelassen
- Ausgegraute Haupt-Knöpfe (Verlauf bei 40 % Deckkraft) wirken matt – gleich wie die Webseite, klar als „noch nicht“ erkennbar.
- Langsames Einblenden im Assistenten gibt es nur in der versteckten Web-Vorschau (Hintergrund-Tab), nicht auf dem iPhone.

// Längere Hilfetexte: Schritt-für-Schritt-Anleitungen, Fragen & Antworten, Befehlsübersicht, Vorlagen.
// Einfache Sprache, kurze Sätze, kein Fachjargon. Englisch + Deutsch.
import type { BotKind } from '@/api';
import { lang } from './i18n';

export type Guide = { title: string; steps: string[] };
export type Faq = { q: string; a: string; guide?: GuideKey };
export type Command = { cmd: string; what: string };
export type GuideKey = 'roomLink' | 'token' | 'designer' | 'name' | 'messages' | 'owner';

const en = {
  guides: {
    roomLink: {
      title: 'How to copy your room link',
      steps: [
        '📱 Open Highrise and go into your room.',
        '⋯ Tap the room name at the top (or the ⋯ menu).',
        '🔗 Tap “Share” and then “Copy link”.',
        '↩️ Come back here and tap “Paste”.',
      ],
    },
    token: {
      title: 'How to get the secret key (bot token)',
      steps: [
        '🌐 Tap “Open website” – create.highrise.game opens.',
        '🔑 Log in with your Highrise account.',
        '🤖 Open “Bots & API Keys” and tap “Create Bot”.',
        '📋 Give it a name, then copy the long key (token).',
        '↩️ Come back here and tap “Paste”.',
      ],
    },
    designer: {
      title: 'How to give your bot Designer rights',
      steps: [
        '📱 Open Highrise and go into your room.',
        '⚙️ Open the room settings (⋯ → Settings).',
        '👥 Tap “Designers” and then “Add”.',
        '🔎 Search the name of your bot (the one you made on create.highrise.game).',
        '✅ Add it. Done – the bot can now enter and move.',
      ],
    },
    name: {
      title: 'Tips for the name',
      steps: ['✏️ Pick any name you like, e.g. “Lobby Greeter”.', '👀 Only you see it in this app. You can change it later.'],
    },
    messages: {
      title: 'How welcome messages work',
      steps: [
        '👋 When someone enters your room, the bot picks one of your messages.',
        '🏷️ Write {username} where the guest’s name should appear.',
        '✨ Tap a ready-made message below or write your own.',
      ],
    },
    owner: {
      title: 'Why the owner matters',
      steps: [
        '👑 The owner gets full control of the moderation bot in the room.',
        '✍️ Type your Highrise username, without @.',
        '⏭️ You can skip this and add it later.',
      ],
    },
  } as Record<GuideKey, Guide>,
  why: {
    kind: 'Each bot does one job. You can make more bots later.',
    name: 'The name helps you find your bot in the app.',
    room: 'The bot needs to know which room it should join.',
    token: 'Highrise gives every bot its own secret key. With it, our server can log in as your bot. We keep it encrypted and never show it again.',
    designer: 'Without Designer rights, Highrise does not let the bot enter or move in your room.',
    messages: 'These are the messages your bot says to new guests.',
    owner: 'The room owner can use every moderation command.',
  } as Record<string, string>,
  templates: [
    'Welcome {username}! 🎉',
    'Hey {username}, have fun! 👋',
    'Nice to see you, {username} ✨',
    'Hi {username}! Grab a seat and enjoy 🎶',
  ],
  faq: [
    { q: 'How do I create a bot?', a: 'Go to the Bots tab and tap “+” (or “Create your first bot”). The app asks one simple question per screen. It takes about two minutes.' },
    { q: 'Where do I get the secret key (token)?', a: 'On create.highrise.game under “Bots & API Keys”. Create a bot there and copy its key.', guide: 'token' },
    { q: 'How do I give my bot Designer rights?', a: 'In your room settings under “Designers”. Without it, the bot cannot enter your room.', guide: 'designer' },
    { q: 'Where do I find my room link?', a: 'In Highrise: open your room → Share → Copy link.', guide: 'roomLink' },
    { q: 'My bot shows “Problem”. What now?', a: 'Open the bot and tap “Fix it”. Most often the bot is missing Designer rights or the secret key is wrong.' },
    { q: 'How do I stop a bot?', a: 'Tap its switch on the Bots tab. Tap again to start it.' },
    { q: 'What does “runtime” mean?', a: 'It shows how long your bot can still run. Runtime is managed on highrise-bots.com.' },
    { q: 'How do I delete my account?', a: 'Account tab → Delete account. You need your password. All your bots are deleted too.' },
  ] as Faq[],
  commands: {
    welcome: [
      { cmd: '-welcome @user text', what: 'Set a personal welcome for one person' },
      { cmd: '-posuser @user', what: 'Bot follows this person’s position' },
      { cmd: '-stoppos @user', what: 'Stop following' },
      { cmd: '-posbot 6 0 8', what: 'Move the bot to x y z' },
    ],
    mod: [
      { cmd: '!help', what: 'Show all commands in the room' },
      { cmd: '!warn @user [reason]', what: 'Give a warning' },
      { cmd: '!mute @user / !unmute @user', what: 'Mute or unmute someone' },
      { cmd: '!kick @user', what: 'Remove someone from the room' },
      { cmd: '!ban @user / !unban @user', what: 'Ban or unban someone' },
      { cmd: '!tp @user <spot>', what: 'Teleport someone to a spot' },
      { cmd: '!go <spot>', what: 'Teleport yourself to a spot' },
      { cmd: '!setrole @user admin|moderator|vip', what: 'Give someone a role' },
      { cmd: '!addword <word> [action]', what: 'Block a word' },
      { cmd: '!removeword <word>', what: 'Unblock a word' },
      { cmd: '!dance N / !dances', what: 'Let the bot dance' },
    ],
    music: [
      { cmd: '-play <song>  (-p)', what: 'Add a song to the queue' },
      { cmd: '-playtop <song>  (-pt)', what: 'Play a song next' },
      { cmd: '-skip  (-s)', what: 'Skip the current song' },
      { cmd: '-queue  (-q)', what: 'Show the queue' },
      { cmd: '-np', what: 'Show the song that plays now' },
      { cmd: '-volup / -voldown', what: 'Louder or quieter' },
      { cmd: '-clearqueue', what: 'Empty the queue' },
      { cmd: '!autoplay on / off', what: 'Keep playing when the queue is empty' },
      { cmd: '-add_dj @user', what: 'Make someone a DJ' },
      { cmd: '-block @user / -unblock @user', what: 'Stop or allow requests from someone' },
    ],
  } as Record<BotKind, Command[]>,
  fix: {
    designer: 'The bot has no Designer rights in your room',
    token: 'The secret key (token) is wrong or was deleted',
    room: 'The room link is wrong or the room was deleted',
    host: 'Our bot server is busy for a moment',
  },
};

const de: typeof en = {
  guides: {
    roomLink: {
      title: 'So kopierst du deinen Raum-Link',
      steps: [
        '📱 Öffne Highrise und geh in deinen Raum.',
        '⋯ Tippe oben auf den Raumnamen (oder das ⋯-Menü).',
        '🔗 Tippe auf „Teilen“ und dann „Link kopieren“.',
        '↩️ Komm hierher zurück und tippe auf „Einfügen“.',
      ],
    },
    token: {
      title: 'So bekommst du den geheimen Schlüssel (Bot-Token)',
      steps: [
        '🌐 Tippe auf „Webseite öffnen“ – create.highrise.game öffnet sich.',
        '🔑 Melde dich mit deinem Highrise-Konto an.',
        '🤖 Öffne „Bots & API Keys“ und tippe auf „Create Bot“.',
        '📋 Gib ihm einen Namen und kopiere den langen Schlüssel (Token).',
        '↩️ Komm hierher zurück und tippe auf „Einfügen“.',
      ],
    },
    designer: {
      title: 'So gibst du deinem Bot Designer-Rechte',
      steps: [
        '📱 Öffne Highrise und geh in deinen Raum.',
        '⚙️ Öffne die Raum-Einstellungen (⋯ → Einstellungen).',
        '👥 Tippe auf „Designer“ und dann „Hinzufügen“.',
        '🔎 Such den Namen deines Bots (den du auf create.highrise.game angelegt hast).',
        '✅ Hinzufügen. Fertig – der Bot darf jetzt rein und sich bewegen.',
      ],
    },
    name: {
      title: 'Tipps für den Namen',
      steps: ['✏️ Nimm einen beliebigen Namen, z. B. „Lobby-Begrüßer“.', '👀 Nur du siehst ihn in der App. Du kannst ihn später ändern.'],
    },
    messages: {
      title: 'So funktionieren Willkommensnachrichten',
      steps: [
        '👋 Kommt jemand in deinen Raum, nimmt der Bot eine deiner Nachrichten.',
        '🏷️ Schreib {username}, wo der Name des Gastes stehen soll.',
        '✨ Tippe unten auf eine fertige Nachricht oder schreib deine eigene.',
      ],
    },
    owner: {
      title: 'Warum der Besitzer wichtig ist',
      steps: [
        '👑 Der Besitzer darf beim Moderations-Bot im Raum alles.',
        '✍️ Gib deinen Highrise-Benutzernamen ein, ohne @.',
        '⏭️ Du kannst das überspringen und später nachtragen.',
      ],
    },
  },
  why: {
    kind: 'Jeder Bot hat eine Aufgabe. Weitere Bots kannst du später anlegen.',
    name: 'Mit dem Namen findest du deinen Bot in der App wieder.',
    room: 'Der Bot muss wissen, in welchen Raum er soll.',
    token: 'Highrise gibt jedem Bot einen eigenen geheimen Schlüssel. Damit kann sich unser Server als dein Bot anmelden. Wir speichern ihn verschlüsselt und zeigen ihn nie wieder an.',
    designer: 'Ohne Designer-Rechte lässt Highrise den Bot nicht in deinen Raum und er kann sich nicht bewegen.',
    messages: 'Diese Nachrichten sagt dein Bot zu neuen Gästen.',
    owner: 'Der Raum-Besitzer darf alle Moderations-Befehle benutzen.',
  },
  templates: [
    'Willkommen {username}! 🎉',
    'Hey {username}, viel Spaß! 👋',
    'Schön, dass du da bist, {username} ✨',
    'Hi {username}! Setz dich und genieß die Musik 🎶',
  ],
  faq: [
    { q: 'Wie lege ich einen Bot an?', a: 'Geh auf den Reiter „Bots“ und tippe auf „+“ (oder „Ersten Bot anlegen“). Die App stellt dir pro Seite eine einfache Frage. Das dauert etwa zwei Minuten.' },
    { q: 'Wo bekomme ich den geheimen Schlüssel (Token)?', a: 'Auf create.highrise.game unter „Bots & API Keys“. Leg dort einen Bot an und kopiere seinen Schlüssel.', guide: 'token' },
    { q: 'Wie gebe ich meinem Bot Designer-Rechte?', a: 'In den Raum-Einstellungen unter „Designer“. Ohne diese Rechte kommt der Bot nicht in deinen Raum.', guide: 'designer' },
    { q: 'Wo finde ich meinen Raum-Link?', a: 'In Highrise: Raum öffnen → Teilen → Link kopieren.', guide: 'roomLink' },
    { q: 'Mein Bot zeigt „Problem“. Was nun?', a: 'Öffne den Bot und tippe auf „Beheben“. Meistens fehlen die Designer-Rechte oder der geheime Schlüssel stimmt nicht.' },
    { q: 'Wie stoppe ich einen Bot?', a: 'Tippe im Reiter „Bots“ auf seinen Schalter. Nochmal tippen startet ihn wieder.' },
    { q: 'Was bedeutet „Laufzeit“?', a: 'Sie zeigt, wie lange dein Bot noch laufen kann. Die Laufzeit wird auf highrise-bots.com verwaltet.' },
    { q: 'Wie lösche ich mein Konto?', a: 'Reiter „Konto“ → Konto löschen. Du brauchst dein Passwort. Alle deine Bots werden mit gelöscht.' },
  ],
  commands: {
    welcome: [
      { cmd: '-welcome @user Text', what: 'Persönliche Begrüßung für eine Person' },
      { cmd: '-posuser @user', what: 'Bot übernimmt die Position dieser Person' },
      { cmd: '-stoppos @user', what: 'Position nicht mehr übernehmen' },
      { cmd: '-posbot 6 0 8', what: 'Bot auf x y z stellen' },
    ],
    mod: [
      { cmd: '!help', what: 'Alle Befehle im Raum anzeigen' },
      { cmd: '!warn @user [Grund]', what: 'Verwarnung geben' },
      { cmd: '!mute @user / !unmute @user', what: 'Stumm schalten / wieder erlauben' },
      { cmd: '!kick @user', what: 'Jemanden aus dem Raum werfen' },
      { cmd: '!ban @user / !unban @user', what: 'Bannen / Bann aufheben' },
      { cmd: '!tp @user <Ziel>', what: 'Jemanden teleportieren' },
      { cmd: '!go <Ziel>', what: 'Dich selbst teleportieren' },
      { cmd: '!setrole @user admin|moderator|vip', what: 'Rolle vergeben' },
      { cmd: '!addword <Wort> [Aktion]', what: 'Wort verbieten' },
      { cmd: '!removeword <Wort>', what: 'Wort wieder erlauben' },
      { cmd: '!dance N / !dances', what: 'Bot tanzen lassen' },
    ],
    music: [
      { cmd: '-play <Song>  (-p)', what: 'Song in die Warteschlange' },
      { cmd: '-playtop <Song>  (-pt)', what: 'Song als Nächstes spielen' },
      { cmd: '-skip  (-s)', what: 'Aktuellen Song überspringen' },
      { cmd: '-queue  (-q)', what: 'Warteschlange zeigen' },
      { cmd: '-np', what: 'Zeigt, was gerade läuft' },
      { cmd: '-volup / -voldown', what: 'Lauter / leiser' },
      { cmd: '-clearqueue', what: 'Warteschlange leeren' },
      { cmd: '!autoplay on / off', what: 'Weiterspielen, wenn die Schlange leer ist' },
      { cmd: '-add_dj @user', what: 'Jemanden zum DJ machen' },
      { cmd: '-block @user / -unblock @user', what: 'Wünsche einer Person sperren / erlauben' },
    ],
  },
  fix: {
    designer: 'Der Bot hat keine Designer-Rechte in deinem Raum',
    token: 'Der geheime Schlüssel (Token) ist falsch oder wurde gelöscht',
    room: 'Der Raum-Link ist falsch oder der Raum wurde gelöscht',
    host: 'Unser Bot-Server ist gerade kurz beschäftigt',
  },
};

export const content = lang === 'de' ? de : en;
export const SUPPORT_DISCORD = 'https://discord.gg/kjbNyzPeKW';
export const CREATE_HIGHRISE = 'https://create.highrise.game';

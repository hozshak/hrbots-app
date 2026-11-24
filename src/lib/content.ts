// Längere Hilfetexte: „Zeig mir, wie“-Schritte (mit Emoji), Fragen & Antworten, Chat-Wörter je Bot-Art, fertige Vorlagen.
// Ganz einfache Sprache, kurze Sätze, keine Fachwörter. Englisch, Deutsch, Arabisch.
// `content.x` liest immer die aktuelle Sprache (Getter), damit ein Sprachwechsel sofort wirkt.
import type { BotKind } from '@/api';
import { getLang, type Lang } from './i18n';
import { commandsFor, type CmdKind, type Command } from './commands';

export type { Command, CmdKind };
export type Guide = { title: string; steps: string[] };
export type Faq = { q: string; a: string; guide?: GuideKey };
export type GuideKey =
  | 'roomLink' | 'token' | 'designer' | 'messages' | 'link' | 'vipzone' | 'spot' | 'stand'
  | 'register' | 'newBot' | 'startStop' | 'password' | 'djSongs' | 'radio';

export const CREATE_HIGHRISE = 'https://create.highrise.game';
export const SUPPORT_DISCORD = 'https://discord.gg/kjbNyzPeKW';
/** Raum des HR-Bots-Helfers, der den Verknüpfungs-Code flüstert */
export const LINK_ROOM = 'https://high.rs/room/6738fee568d4398a5e864aa4';

type Pack = {
  guides: Record<GuideKey, Guide>;
  why: Record<'kind' | 'name' | 'room' | 'token' | 'designer' | 'messages' | 'owner', string>;
  greetings: string[];
  announcements: string[];
  badWords: string[];
  placeNames: string[];
  vipNames: string[];
  botNames: Record<BotKind, string[]>;
  subjects: string[];
  faq: Faq[];
  fix: { designer: string; token: string; room: string };
};

const en: Pack = {
  guides: {
    roomLink: {
      title: 'Copy your room link',
      steps: ['📱 Open Highrise and go into your room.', '👆 Tap the room name at the top.', '🔗 Tap “Share”, then “Copy link”.', '↩️ Come back here and tap “Paste”.'],
    },
    token: {
      title: 'Get the bot key',
      steps: ['🌐 Tap “Open website”.', '🔑 Log in with your Highrise account.', '🤖 Tap “Create Bot” and give it a name.', '📋 Copy the long key.', '↩️ Come back here and tap “Paste”.'],
    },
    designer: {
      title: 'Let the bot into your room',
      steps: ['📱 Open Highrise and go into your room.', '⚙️ Open the room settings.', '👥 Tap “Designers”, then “Add”.', '🔎 Search the name of your bot.', '✅ Add it. Done!'],
    },
    messages: {
      title: 'How greetings work',
      steps: ['👋 Someone comes into your room.', '🎲 The bot picks one of your messages.', '🏷️ {username} becomes their name.'],
    },
    link: {
      title: 'Connect your Highrise account',
      steps: ['🚪 Tap “Open the room” – Highrise opens.', '💬 Write anything in the chat, e.g. “hi”.', '🤫 The bot whispers you a code (6 letters and numbers).', '↩️ Come back here and type the code.'],
    },
    vipzone: {
      title: 'Make a VIP area the easy way',
      steps: ['📱 Go into your room in Highrise.', '🚶 Stand in the middle of the area.', '💬 Type !addvipzone in the chat.', '✅ The bot saves the spot for you.'],
    },
    spot: {
      title: 'Find the numbers of a spot',
      steps: ['🚶 Walk to the spot in your Highrise room.', '📍 Bot page → “Where it stands” → “Bring the bot to me” (or type -here in the chat). The bot comes to you.', '🤖 Come back here and tap “Use the bot’s spot”.'],
    },
    stand: {
      title: 'Move the bot to a new spot',
      steps: ['📱 Go into your room in Highrise.', '🚶 Stand where the bot should stand.', '📍 In the app: open the bot → “Where it stands” → tap “Bring the bot to me”.', '💬 Or type -here in the room chat.', '✅ The bot walks to you and remembers the spot.'],
    },
    register: {
      title: 'Make an account',
      steps: ['💌 Get an invite link from our team (ask on Discord).', '👆 On the sign-in page tap “I have an invite”.', '📋 Paste the link and tap “Check invite”.', '🙂 Pick a name and a password.', '✅ Accept the rules and tap “Create account”.', '💬 Then connect Discord – the app shows you how.'],
    },
    newBot: {
      title: 'Make a new bot',
      steps: ['➕ On the Bots page tap “New”.', '🤖 Pick what the bot should do.', '🏷️ Give it a name.', '🔗 Paste your room link.', '🔑 Paste the bot key from Highrise.', '🚪 Let the bot into your room (Designer).', '✅ Done! If it has time left, it goes into your room right away.'],
    },
    startStop: {
      title: 'Turn a bot on and off',
      steps: ['👆 Tap the big ON/OFF button on the bot.', '⏱️ After 1–2 seconds the bot is in your room.', '💤 Turn it off – the time left is kept.', '🔄 “Restart” (Expert settings) keeps the time too.'],
    },
    password: {
      title: 'Change your password',
      steps: ['🙂 Go to Account → Change password.', '🔒 Type your old password.', '🆕 Type the new one two times.', '✅ Other phones stay signed in.'],
    },
    djSongs: {
      title: 'Add your own songs to the DJ',
      steps: ['🎧 Open your DJ bot → Expert settings → My songs.', '➕ Tap “Add a song (.mp3)” and pick a song file.', '📏 Up to 20 songs, each up to 10 MB.', '🔁 Turn on “Keep playing” – the DJ plays them when nobody wishes a song.'],
    },
    radio: {
      title: 'Your radio',
      steps: ['📻 Every DJ bot comes with its own radio.', '🎧 Tap “Listen here” to hear it in the app.', '🔌 Under Account → My radios you can connect a radio to another DJ.', '🧰 “Details” has the data for music programs on a computer.'],
    },
  },
  why: {
    kind: 'Each bot has one job. You can make more later.',
    name: 'The name helps you find your bot.',
    room: 'The bot must know which room to go to.',
    token: 'Highrise gives each bot its own key. With it, the bot can log in. We keep it safe and never show it again.',
    designer: 'Without Designer rights, Highrise does not let the bot in.',
    messages: 'The bot says these to new guests.',
    owner: 'The boss of the room can use every chat word.',
  },
  greetings: ['Welcome {username}! 🎉', 'Hey {username}, have fun! 👋', 'Nice to see you, {username} ✨', 'Hi {username}! Enjoy the music 🎶', '{username} is here! 🥳', 'Welcome back, {username} 💜'],
  announcements: ['🎶 Ask for a song with -play <song name>', '💜 Be nice to everyone!', '📸 Take a photo and share the room!', '⭐ Follow the room owner for more parties'],
  badWords: ['spam', 'scam', 'hack', 'cheat', 'virus', 'phishing'],
  placeNames: ['stage', 'dj', 'bar', 'lobby', 'dance', 'vip'],
  vipNames: ['vip lounge', 'stage', 'backstage', 'sofa'],
  botNames: { welcome: ['Hello Bot', 'Lobby Buddy', 'Door Bot'], mod: ['Room Guard', 'Safety Bot', 'Party Police'], music: ['DJ Bot', 'Party Radio', 'Chill Beats'] },
  subjects: ['My bot does not start', 'My bot is not in my room', 'Question about my account', 'Something else'],
  faq: [
    { q: 'How do I make a bot?', a: 'Tap “New” on the Bots page. The app asks one question per page. It takes 2 minutes.' },
    { q: 'Where do I get the bot key?', a: 'On the Highrise website for creators. Make a bot there and copy its key.', guide: 'token' },
    { q: 'The bot is not in my room.', a: 'Give the bot Designer rights in your room. Then turn it off and on.', guide: 'designer' },
    { q: 'Where is my room link?', a: 'In Highrise: room name → Share → Copy link.', guide: 'roomLink' },
    { q: 'My bot says “Needs help”.', a: 'Tap the orange button. The app shows you what to do.' },
    { q: 'How do I turn a bot off?', a: 'Tap the big ON button. It turns OFF. Tap again to turn it on.' },
    { q: 'What does “time left” mean?', a: 'It shows how long your bot can still be on.' },
    { q: 'How do I change the language?', a: 'Account → Language.' },
    { q: 'How do I delete my account?', a: 'Account → Delete account. You need your password. All your bots are deleted too.' },
    { q: 'How do I get an account?', a: 'You need an invite from our team. Ask us on Discord. Then tap “I have an invite” on the sign-in page.', guide: 'register' },
    { q: 'What is the difference between a greeter and a guard?', a: 'The greeter says hello to everyone who comes in. The guard keeps your room safe: warnings, bad words, VIP areas, places to jump to and more.' },
    { q: 'Do I lose my settings when I change the room?', a: 'No. Messages, helpers and everything else stay. Change the room in Expert settings.' },
    { q: 'How do I make someone a helper of my bot?', a: 'Open the bot → Helpers → Add. They can then use the chat words.' },
    { q: 'My bot is off, but it still has time.', a: 'Someone turned it off. Turn it on again. Time only counts down while the bot is on.', guide: 'startStop' },
    { q: 'How do I add my own songs to the DJ?', a: 'In the DJ’s Expert settings under “My songs”.', guide: 'djSongs' },
    { q: 'How do I hear my radio?', a: 'Open your DJ → Music → “Listen here”. Or Account → My radios.', guide: 'radio' },
    { q: 'How do I change my password?', a: 'Account → Change password.', guide: 'password' },
    { q: 'How do I move my bot to another spot?', a: 'Stand on the spot in your room. Then open the bot → “Where it stands” → “Bring the bot to me”. Or type -here in the room chat.', guide: 'stand' },
    { q: 'What is “Bot gold”?', a: 'The gold your bot has in Highrise. You can only look at it here.' },
  ],
  fix: {
    designer: 'The bot has no Designer rights in your room',
    token: 'The bot key is wrong or was deleted',
    room: 'The room link is wrong',
  },
};

const de: Pack = {
  guides: {
    roomLink: {
      title: 'Raum-Link kopieren',
      steps: ['📱 Öffne Highrise und geh in deinen Raum.', '👆 Tippe oben auf den Raumnamen.', '🔗 Tippe auf „Teilen“, dann „Link kopieren“.', '↩️ Komm zurück und tippe auf „Einfügen“.'],
    },
    token: {
      title: 'Bot-Schlüssel holen',
      steps: ['🌐 Tippe auf „Webseite öffnen“.', '🔑 Melde dich mit deinem Highrise-Konto an.', '🤖 Tippe auf „Create Bot“ und gib ihm einen Namen.', '📋 Kopiere den langen Schlüssel.', '↩️ Komm zurück und tippe auf „Einfügen“.'],
    },
    designer: {
      title: 'Bot in den Raum lassen',
      steps: ['📱 Öffne Highrise und geh in deinen Raum.', '⚙️ Öffne die Raum-Einstellungen.', '👥 Tippe auf „Designer“, dann „Hinzufügen“.', '🔎 Such den Namen deines Bots.', '✅ Hinzufügen. Fertig!'],
    },
    messages: {
      title: 'So klappt die Begrüßung',
      steps: ['👋 Jemand kommt in deinen Raum.', '🎲 Der Bot nimmt eine deiner Nachrichten.', '🏷️ Aus {username} wird der Name.'],
    },
    link: {
      title: 'Highrise-Konto verbinden',
      steps: ['🚪 Tippe auf „Raum öffnen“ – Highrise geht auf.', '💬 Schreib irgendwas in den Chat, z. B. „hi“.', '🤫 Der Bot flüstert dir einen Code mit 6 Zeichen.', '↩️ Komm zurück und tipp den Code ein.'],
    },
    vipzone: {
      title: 'VIP-Bereich ganz einfach',
      steps: ['📱 Geh in Highrise in deinen Raum.', '🚶 Stell dich in die Mitte des Bereichs.', '💬 Schreib !addvipzone in den Chat.', '✅ Der Bot merkt sich die Stelle.'],
    },
    spot: {
      title: 'Die Zahlen einer Stelle finden',
      steps: ['🚶 Geh in deinem Highrise-Raum an die Stelle.', '📍 Bot-Seite → „Wo er steht“ → „Bot zu mir holen“ (oder schreib -here in den Chat). Der Bot kommt zu dir.', '🤖 Komm zurück und tippe auf „Platz vom Bot nehmen“.'],
    },
    stand: {
      title: 'Bot an eine neue Stelle bringen',
      steps: ['📱 Geh in Highrise in deinen Raum.', '🚶 Stell dich dahin, wo der Bot stehen soll.', '📍 In der App: Bot öffnen → „Wo er steht“ → „Bot zu mir holen“ tippen.', '💬 Oder schreib -here in den Raum-Chat.', '✅ Der Bot läuft zu dir und merkt sich die Stelle.'],
    },
    register: {
      title: 'Ein Konto machen',
      steps: ['💌 Hol dir einen Einladungs-Link von unserem Team (frag auf Discord).', '👆 Tippe beim Anmelden auf „Ich habe eine Einladung“.', '📋 Füg den Link ein und tippe auf „Einladung prüfen“.', '🙂 Such dir einen Namen und ein Passwort aus.', '✅ Regeln annehmen und auf „Konto erstellen“ tippen.', '💬 Dann Discord verbinden – die App zeigt dir, wie.'],
    },
    newBot: {
      title: 'Einen neuen Bot machen',
      steps: ['➕ Tippe auf der Bots-Seite auf „Neu“.', '🤖 Such aus, was der Bot machen soll.', '🏷️ Gib ihm einen Namen.', '🔗 Füg deinen Raum-Link ein.', '🔑 Füg den Bot-Schlüssel von Highrise ein.', '🚪 Lass den Bot in deinen Raum (Designer).', '✅ Fertig! Hat er noch Zeit, geht er gleich in deinen Raum.'],
    },
    startStop: {
      title: 'Bot an- und ausschalten',
      steps: ['👆 Tippe beim Bot auf den großen AN/AUS-Knopf.', '⏱️ Nach 1–2 Sekunden ist der Bot in deinem Raum.', '💤 Ausschalten – die übrige Zeit bleibt gespeichert.', '🔄 „Neu starten“ (Experten-Einstellungen) behält die Zeit auch.'],
    },
    password: {
      title: 'Passwort ändern',
      steps: ['🙂 Geh zu Konto → Passwort ändern.', '🔒 Tipp dein altes Passwort ein.', '🆕 Tipp das neue zweimal ein.', '✅ Andere Handys bleiben angemeldet.'],
    },
    djSongs: {
      title: 'Eigene Lieder für den DJ',
      steps: ['🎧 Öffne deinen DJ-Bot → Experten-Einstellungen → Meine Lieder.', '➕ Tippe auf „Lied hinzufügen (.mp3)“ und such eine Lied-Datei aus.', '📏 Bis zu 20 Lieder, je bis 10 MB.', '🔁 Schalte „Weiterspielen“ an – der DJ spielt sie, wenn sich niemand etwas wünscht.'],
    },
    radio: {
      title: 'Dein Radio',
      steps: ['📻 Jeder DJ-Bot hat sein eigenes Radio.', '🎧 Tippe auf „Hier anhören“, um es in der App zu hören.', '🔌 Unter Konto → Meine Radios kannst du ein Radio mit einem anderen DJ verbinden.', '🧰 Bei „Details“ stehen die Daten für Musikprogramme am Computer.'],
    },
  },
  why: {
    kind: 'Jeder Bot hat eine Aufgabe. Du kannst später mehr machen.',
    name: 'Mit dem Namen findest du deinen Bot.',
    room: 'Der Bot muss wissen, in welchen Raum er soll.',
    token: 'Highrise gibt jedem Bot einen eigenen Schlüssel. Damit kann er sich anmelden. Wir passen gut darauf auf und zeigen ihn nie wieder.',
    designer: 'Ohne Designer-Rechte lässt Highrise den Bot nicht rein.',
    messages: 'Das sagt der Bot zu neuen Gästen.',
    owner: 'Der Chef des Raums darf alle Chat-Wörter benutzen.',
  },
  greetings: ['Willkommen {username}! 🎉', 'Hey {username}, viel Spaß! 👋', 'Schön, dass du da bist, {username} ✨', 'Hi {username}! Genieß die Musik 🎶', '{username} ist da! 🥳', 'Willkommen zurück, {username} 💜'],
  announcements: ['🎶 Wünsch dir ein Lied mit -play <Liedname>', '💜 Sei nett zu allen!', '📸 Mach ein Foto und teile den Raum!', '⭐ Folge dem Raum-Chef für mehr Partys'],
  badWords: ['spam', 'scam', 'hack', 'betrug', 'cheat', 'virus'],
  placeNames: ['bühne', 'dj', 'bar', 'lobby', 'tanzen', 'vip'],
  vipNames: ['vip lounge', 'bühne', 'backstage', 'sofa'],
  botNames: { welcome: ['Hallo-Bot', 'Lobby-Kumpel', 'Tür-Bot'], mod: ['Raum-Wächter', 'Aufpasser', 'Party-Polizei'], music: ['DJ-Bot', 'Party-Radio', 'Chill-Beats'] },
  subjects: ['Mein Bot startet nicht', 'Mein Bot ist nicht in meinem Raum', 'Frage zu meinem Konto', 'Etwas anderes'],
  faq: [
    { q: 'Wie mache ich einen Bot?', a: 'Tippe auf der Bots-Seite auf „Neu“. Die App stellt eine Frage pro Seite. Das dauert 2 Minuten.' },
    { q: 'Wo bekomme ich den Bot-Schlüssel?', a: 'Auf der Highrise-Webseite für Macher. Mach dort einen Bot und kopiere seinen Schlüssel.', guide: 'token' },
    { q: 'Der Bot ist nicht in meinem Raum.', a: 'Gib dem Bot Designer-Rechte in deinem Raum. Dann aus- und wieder einschalten.', guide: 'designer' },
    { q: 'Wo ist mein Raum-Link?', a: 'In Highrise: Raumname → Teilen → Link kopieren.', guide: 'roomLink' },
    { q: 'Mein Bot zeigt „Braucht Hilfe“.', a: 'Tippe auf den orangen Knopf. Die App zeigt dir, was zu tun ist.' },
    { q: 'Wie schalte ich einen Bot aus?', a: 'Tippe auf den großen AN-Knopf. Dann ist er AUS. Nochmal tippen schaltet ihn an.' },
    { q: 'Was heißt „Zeit übrig“?', a: 'So lange kann dein Bot noch an sein.' },
    { q: 'Wie ändere ich die Sprache?', a: 'Konto → Sprache.' },
    { q: 'Wie lösche ich mein Konto?', a: 'Konto → Konto löschen. Du brauchst dein Passwort. Alle Bots werden auch gelöscht.' },
    { q: 'Wie bekomme ich ein Konto?', a: 'Du brauchst eine Einladung von unserem Team. Frag uns auf Discord. Dann tippe beim Anmelden auf „Ich habe eine Einladung“.', guide: 'register' },
    { q: 'Was ist der Unterschied zwischen Begrüßer und Wächter?', a: 'Der Begrüßer sagt allen Hallo, die reinkommen. Der Wächter passt auf deinen Raum auf: Verwarnungen, böse Wörter, VIP-Bereiche, Orte zum Hinspringen und mehr.' },
    { q: 'Verliere ich Einstellungen, wenn ich den Raum ändere?', a: 'Nein. Nachrichten, Helfer und alles andere bleiben. Den Raum änderst du in den Experten-Einstellungen.' },
    { q: 'Wie mache ich jemanden zum Helfer meines Bots?', a: 'Öffne den Bot → Helfer → Hinzufügen. Dann darf die Person die Chat-Wörter benutzen.' },
    { q: 'Mein Bot ist aus, hat aber noch Zeit.', a: 'Jemand hat ihn ausgeschaltet. Schalte ihn wieder an. Die Zeit läuft nur, wenn der Bot an ist.', guide: 'startStop' },
    { q: 'Wie füge ich eigene Lieder zum DJ hinzu?', a: 'In den Experten-Einstellungen des DJs unter „Meine Lieder“.', guide: 'djSongs' },
    { q: 'Wie höre ich mein Radio?', a: 'Öffne deinen DJ → Musik → „Hier anhören“. Oder Konto → Meine Radios.', guide: 'radio' },
    { q: 'Wie ändere ich mein Passwort?', a: 'Konto → Passwort ändern.', guide: 'password' },
    { q: 'Wie stelle ich meinen Bot an eine andere Stelle?', a: 'Stell dich in deinem Raum an die Stelle. Dann Bot öffnen → „Wo er steht“ → „Bot zu mir holen“. Oder schreib -here in den Raum-Chat.', guide: 'stand' },
    { q: 'Was ist „Bot-Gold“?', a: 'Das Gold, das dein Bot in Highrise hat. Hier kannst du es nur ansehen.' },
  ],
  fix: {
    designer: 'Der Bot hat keine Designer-Rechte in deinem Raum',
    token: 'Der Bot-Schlüssel ist falsch oder gelöscht',
    room: 'Der Raum-Link ist falsch',
  },
};

const ar: Pack = {
  guides: {
    roomLink: {
      title: 'انسخ رابط غرفتك',
      steps: ['📱 افتح Highrise وادخل غرفتك.', '👆 اضغط على اسم الغرفة في الأعلى.', '🔗 اضغط «مشاركة» ثم «نسخ الرابط».', '↩️ ارجع إلى هنا واضغط «لصق».'],
    },
    token: {
      title: 'احصل على مفتاح البوت',
      steps: ['🌐 اضغط «افتح الموقع».', '🔑 سجّل الدخول بحساب Highrise.', '🤖 اضغط «Create Bot» واكتب اسمًا له.', '📋 انسخ المفتاح الطويل.', '↩️ ارجع إلى هنا واضغط «لصق».'],
    },
    designer: {
      title: 'دع البوت يدخل غرفتك',
      steps: ['📱 افتح Highrise وادخل غرفتك.', '⚙️ افتح إعدادات الغرفة.', '👥 اضغط «Designers» ثم «إضافة».', '🔎 ابحث عن اسم البوت.', '✅ أضفه. انتهى!'],
    },
    messages: {
      title: 'كيف يعمل الترحيب',
      steps: ['👋 يدخل شخص إلى غرفتك.', '🎲 يختار البوت رسالة من رسائلك.', '🏷️ تصبح {username} اسمَ الشخص.'],
    },
    link: {
      title: 'اربط حساب Highrise',
      steps: ['🚪 اضغط «افتح الغرفة» – يفتح Highrise.', '💬 اكتب أي شيء في الدردشة، مثل «hi».', '🤫 يهمس لك البوت برمز من 6 أحرف.', '↩️ ارجع إلى هنا واكتب الرمز.'],
    },
    vipzone: {
      title: 'منطقة VIP بطريقة سهلة',
      steps: ['📱 ادخل غرفتك في Highrise.', '🚶 قف في وسط المنطقة.', '💬 اكتب ‎!addvipzone‎ في الدردشة.', '✅ يحفظ البوت المكان لك.'],
    },
    spot: {
      title: 'اعرف أرقام المكان',
      steps: ['🚶 امشِ إلى المكان في غرفتك في Highrise.', '📍 صفحة البوت ← «أين يقف» ← «أحضر البوت إليّ» (أو اكتب ‎-here‎ في الدردشة). يأتي البوت إليك.', '🤖 ارجع إلى هنا واضغط «خذ مكان البوت».'],
    },
    stand: {
      title: 'انقل البوت إلى مكان جديد',
      steps: ['📱 ادخل غرفتك في Highrise.', '🚶 قف حيث تريد أن يقف البوت.', '📍 في التطبيق: افتح البوت ← «أين يقف» ← اضغط «أحضر البوت إليّ».', '💬 أو اكتب ‎-here‎ في دردشة الغرفة.', '✅ يمشي البوت إليك ويتذكر المكان.'],
    },
    register: {
      title: 'أنشئ حسابًا',
      steps: ['💌 احصل على رابط دعوة من فريقنا (اسأل في Discord).', '👆 في صفحة الدخول اضغط «لدي دعوة».', '📋 الصق الرابط واضغط «افحص الدعوة».', '🙂 اختر اسمًا وكلمة مرور.', '✅ وافق على القواعد واضغط «إنشاء الحساب».', '💬 ثم اربط Discord – يريك التطبيق كيف.'],
    },
    newBot: {
      title: 'اصنع بوتًا جديدًا',
      steps: ['➕ في صفحة البوتات اضغط «جديد».', '🤖 اختر ماذا يفعل البوت.', '🏷️ أعطه اسمًا.', '🔗 الصق رابط غرفتك.', '🔑 الصق مفتاح البوت من Highrise.', '🚪 دع البوت يدخل غرفتك (Designer).', '✅ انتهى! إذا كان لديه وقت، يدخل غرفتك فورًا.'],
    },
    startStop: {
      title: 'تشغيل البوت وإطفاؤه',
      steps: ['👆 اضغط زر التشغيل/الإطفاء الكبير على البوت.', '⏱️ بعد ثانية أو ثانيتين يكون البوت في غرفتك.', '💤 أطفئه – يبقى الوقت المتبقي محفوظًا.', '🔄 «إعادة التشغيل» (إعدادات الخبراء) تحفظ الوقت أيضًا.'],
    },
    password: {
      title: 'غيّر كلمة المرور',
      steps: ['🙂 اذهب إلى الحساب ← تغيير كلمة المرور.', '🔒 اكتب كلمة المرور القديمة.', '🆕 اكتب الجديدة مرتين.', '✅ تبقى الهواتف الأخرى مسجّلة الدخول.'],
    },
    djSongs: {
      title: 'أضف أغانيك إلى الـ DJ',
      steps: ['🎧 افتح بوت الـ DJ ← إعدادات الخبراء ← أغانيّ.', '➕ اضغط «أضف أغنية (‎.mp3‎)» واختر ملف أغنية.', '📏 حتى 20 أغنية، كل واحدة حتى 10 ميغابايت.', '🔁 شغّل «استمر بالتشغيل» – يشغّلها الـ DJ عندما لا يطلب أحد أغنية.'],
    },
    radio: {
      title: 'الراديو الخاص بك',
      steps: ['📻 كل بوت DJ يأتي مع راديو خاص به.', '🎧 اضغط «استمع هنا» لتسمعه في التطبيق.', '🔌 في الحساب ← إذاعاتي يمكنك ربط راديو بـ DJ آخر.', '🧰 في «التفاصيل» بيانات برامج الموسيقى على الكمبيوتر.'],
    },
  },
  why: {
    kind: 'لكل بوت مهمة واحدة. يمكنك صنع المزيد لاحقًا.',
    name: 'الاسم يساعدك على إيجاد البوت.',
    room: 'يجب أن يعرف البوت أي غرفة يدخل.',
    token: 'يعطي Highrise كل بوت مفتاحًا خاصًا به. به يستطيع البوت الدخول. نحفظه بأمان ولا نعرضه مرة أخرى.',
    designer: 'بدون صلاحية Designer لا يسمح Highrise للبوت بالدخول.',
    messages: 'هذا ما يقوله البوت للضيوف الجدد.',
    owner: 'زعيم الغرفة يستطيع استخدام كل كلمات الدردشة.',
  },
  greetings: ['أهلًا {username}! 🎉', 'هلا {username}، استمتع! 👋', 'سعداء برؤيتك يا {username} ✨', 'مرحبًا {username}! استمتع بالموسيقى 🎶', 'وصل {username}! 🥳', 'أهلًا بعودتك يا {username} 💜'],
  announcements: ['🎶 اطلب أغنية بكتابة ‎-play‎ واسم الأغنية', '💜 كن لطيفًا مع الجميع!', '📸 التقط صورة وشارك الغرفة!', '⭐ تابع صاحب الغرفة لحفلات أكثر'],
  badWords: ['spam', 'scam', 'hack', 'احتيال', 'نصب', 'virus'],
  placeNames: ['مسرح', 'dj', 'بار', 'لوبي', 'رقص', 'vip'],
  vipNames: ['vip lounge', 'مسرح', 'كواليس', 'كنبة'],
  botNames: { welcome: ['بوت الترحيب', 'صديق اللوبي', 'بوت الباب'], mod: ['حارس الغرفة', 'بوت الأمان', 'شرطة الحفلة'], music: ['بوت DJ', 'راديو الحفلة', 'ألحان هادئة'] },
  subjects: ['البوت لا يعمل', 'البوت ليس في غرفتي', 'سؤال عن حسابي', 'شيء آخر'],
  faq: [
    { q: 'كيف أصنع بوتًا؟', a: 'اضغط «جديد» في صفحة البوتات. يسألك التطبيق سؤالًا واحدًا في كل صفحة. يستغرق ذلك دقيقتين.' },
    { q: 'من أين أحصل على مفتاح البوت؟', a: 'من موقع Highrise للمبدعين. اصنع بوتًا هناك وانسخ مفتاحه.', guide: 'token' },
    { q: 'البوت ليس في غرفتي.', a: 'أعطِ البوت صلاحية Designer في غرفتك. ثم أطفئه وشغّله من جديد.', guide: 'designer' },
    { q: 'أين رابط غرفتي؟', a: 'في Highrise: اسم الغرفة ← مشاركة ← نسخ الرابط.', guide: 'roomLink' },
    { q: 'البوت يقول «يحتاج مساعدة».', a: 'اضغط الزر البرتقالي. سيريك التطبيق ماذا تفعل.' },
    { q: 'كيف أطفئ البوت؟', a: 'اضغط زر «يعمل» الكبير فيصبح «مطفأ». اضغط مرة أخرى لتشغيله.' },
    { q: 'ماذا يعني «الوقت المتبقي»؟', a: 'يوضح كم من الوقت يمكن أن يبقى البوت شغّالًا.' },
    { q: 'كيف أغيّر اللغة؟', a: 'الحساب ← اللغة.' },
    { q: 'كيف أحذف حسابي؟', a: 'الحساب ← حذف الحساب. تحتاج كلمة المرور. ستُحذف كل البوتات أيضًا.' },
    { q: 'كيف أحصل على حساب؟', a: 'تحتاج دعوة من فريقنا. اسألنا في Discord. ثم اضغط «لدي دعوة» في صفحة الدخول.', guide: 'register' },
    { q: 'ما الفرق بين بوت الترحيب وبوت الحراسة؟', a: 'بوت الترحيب يرحّب بكل من يدخل. بوت الحراسة يحمي غرفتك: تحذيرات، كلمات ممنوعة، مناطق VIP، أماكن للانتقال وأكثر.' },
    { q: 'هل أفقد إعداداتي إذا غيّرت الغرفة؟', a: 'لا. الرسائل والمساعدون وكل شيء آخر يبقى. غيّر الغرفة في إعدادات الخبراء.' },
    { q: 'كيف أجعل شخصًا مساعدًا لبوتي؟', a: 'افتح البوت ← المساعدون ← إضافة. بعدها يستطيع استخدام كلمات الدردشة.' },
    { q: 'البوت مطفأ لكن لديه وقت.', a: 'أطفأه شخص ما. شغّله من جديد. الوقت ينقص فقط عندما يكون البوت شغّالًا.', guide: 'startStop' },
    { q: 'كيف أضيف أغانيّ إلى الـ DJ؟', a: 'في إعدادات الخبراء للـ DJ تحت «أغانيّ».', guide: 'djSongs' },
    { q: 'كيف أسمع الراديو الخاص بي؟', a: 'افتح الـ DJ ← الموسيقى ← «استمع هنا». أو الحساب ← إذاعاتي.', guide: 'radio' },
    { q: 'كيف أغيّر كلمة المرور؟', a: 'الحساب ← تغيير كلمة المرور.', guide: 'password' },
    { q: 'كيف أنقل البوت إلى مكان آخر؟', a: 'قف في المكان داخل غرفتك. ثم افتح البوت ← «أين يقف» ← «أحضر البوت إليّ». أو اكتب ‎-here‎ في دردشة الغرفة.', guide: 'stand' },
    { q: 'ما هو «ذهب البوت»؟', a: 'الذهب الذي يملكه البوت في Highrise. يمكنك هنا مشاهدته فقط.' },
  ],
  fix: {
    designer: 'البوت ليس لديه صلاحية Designer في غرفتك',
    token: 'مفتاح البوت خطأ أو تم حذفه',
    room: 'رابط الغرفة خطأ',
  },
};

const PACKS: Record<Lang, Pack> = { en, de, ar };

export const content: Pack = {
  get guides() { return PACKS[getLang()].guides; },
  get why() { return PACKS[getLang()].why; },
  get greetings() { return PACKS[getLang()].greetings; },
  get announcements() { return PACKS[getLang()].announcements; },
  get badWords() { return PACKS[getLang()].badWords; },
  get placeNames() { return PACKS[getLang()].placeNames; },
  get vipNames() { return PACKS[getLang()].vipNames; },
  get botNames() { return PACKS[getLang()].botNames; },
  get subjects() { return PACKS[getLang()].subjects; },
  get faq() { return PACKS[getLang()].faq; },
  get fix() { return PACKS[getLang()].fix; },
};

/** Rechtliches der Webseite in der App-Sprache (die Seite liest ?lang=) */
export const legalUrl = (page: 'terms' | 'privacy' | 'imprint') => `https://highrise-bots.com/${page}?app=1&lang=${getLang()}`;

/** Alle Chat-Wörter je Bot-Art (+ Verknüpfungs-Helfer „bank“), mit „Wer darf das?“ – siehe commands.ts */
export const chatWords = (): Record<CmdKind, Command[]> => commandsFor(getLang());

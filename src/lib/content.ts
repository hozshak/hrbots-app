// Längere Hilfetexte: „Zeig mir, wie“-Schritte (mit Emoji), Fragen & Antworten, Chat-Wörter je Bot-Art, fertige Vorlagen.
// Ganz einfache Sprache, kurze Sätze, keine Fachwörter. Englisch, Deutsch, Arabisch.
// `content.x` liest immer die aktuelle Sprache (Getter), damit ein Sprachwechsel sofort wirkt.
import type { BotKind } from '@/api';
import { getLang, type Lang } from './i18n';

export type Guide = { title: string; steps: string[] };
export type Faq = { q: string; a: string; guide?: GuideKey };
export type Command = { cmd: string; what: string };
export type GuideKey = 'roomLink' | 'token' | 'designer' | 'messages' | 'link' | 'vipzone' | 'spot' | 'stand';

export const CREATE_HIGHRISE = 'https://create.highrise.game';
export const SUPPORT_DISCORD = 'https://discord.gg/kjbNyzPeKW';
/** Raum des HR-Bots-Helfers, der den Verknüpfungs-Code flüstert */
export const LINK_ROOM = 'https://high.rs/room?id=6738fee568d4398a5e864aa4';

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
  commands: Record<BotKind, Command[]>;
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
      steps: ['🚪 Tap “Open the room” – Highrise opens.', '💬 Write anything in the chat, e.g. “hi”.', '🤫 The bot whispers you a code with 6 letters.', '↩️ Come back here and type the code.'],
    },
    vipzone: {
      title: 'Make a VIP area the easy way',
      steps: ['📱 Go into your room in Highrise.', '🚶 Stand in the middle of the area.', '💬 Type !addvipzone in the chat.', '✅ The bot saves the spot for you.'],
    },
    spot: {
      title: 'Find the numbers of a spot',
      steps: ['🤖 Tap “Use the bot’s spot” to copy where the bot stands.', '🚶 Or: walk there in Highrise and type !posbot – the bot comes to you.', '🔄 Then come back here and tap “Use the bot’s spot”.'],
    },
    stand: {
      title: 'Move the bot the easy way',
      steps: ['📱 Go into your room in Highrise.', '🚶 Stand where the bot should stand.', '💬 Type the chat word below.', '✅ The bot walks to you.'],
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
  ],
  commands: {
    welcome: [
      { cmd: '-welcome @name text', what: 'A special hello for one person' },
      { cmd: '-posuser @name', what: 'The bot goes to where this person stands' },
      { cmd: '-stoppos @name', what: 'Stop that' },
      { cmd: '-posbot 6 0 8', what: 'Send the bot to a spot' },
    ],
    mod: [
      { cmd: '!help', what: 'Show all chat words' },
      { cmd: '!warn @name', what: 'Give a warning' },
      { cmd: '!mute @name / !unmute @name', what: 'Make someone quiet / talk again' },
      { cmd: '!kick @name', what: 'Send someone out of the room' },
      { cmd: '!ban @name / !unban @name', what: 'Block someone / let them back' },
      { cmd: '!report @name reason', what: 'Tell the helpers about a problem' },
      { cmd: '!go place', what: 'Jump to a place' },
      { cmd: '!tp @name place', what: 'Send someone to a place' },
      { cmd: '!setrole @name vip', what: 'Make someone admin, moderator or VIP' },
      { cmd: '!addvipzone', what: 'Make a VIP area where you stand' },
      { cmd: '!posbot', what: 'The bot comes to you' },
      { cmd: '!dance 5', what: 'Let the bot dance' },
    ],
    music: [
      { cmd: '-play song  (-p)', what: 'Add a song' },
      { cmd: '-playtop song  (-pt)', what: 'Play a song next' },
      { cmd: '-skip  (-s)', what: 'Skip the song' },
      { cmd: '-queue  (-q)', what: 'Show the next songs' },
      { cmd: '-np', what: 'Show the song now' },
      { cmd: '-volup / -voldown', what: 'Louder / quieter' },
      { cmd: '-clearqueue', what: 'Remove all next songs' },
      { cmd: '!autoplay on / off', what: 'Keep playing when the list is empty' },
      { cmd: '-add_dj @name', what: 'Make someone a DJ' },
      { cmd: '-block @name / -unblock @name', what: 'Stop or allow song wishes' },
    ],
  },
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
      steps: ['🤖 Tippe auf „Platz vom Bot nehmen“ – dann zählt, wo der Bot steht.', '🚶 Oder: Geh in Highrise hin und schreib !posbot – der Bot kommt zu dir.', '🔄 Dann komm zurück und tippe auf „Platz vom Bot nehmen“.'],
    },
    stand: {
      title: 'Bot ganz einfach bewegen',
      steps: ['📱 Geh in Highrise in deinen Raum.', '🚶 Stell dich dahin, wo der Bot stehen soll.', '💬 Schreib das Chat-Wort unten.', '✅ Der Bot läuft zu dir.'],
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
  ],
  commands: {
    welcome: [
      { cmd: '-welcome @name Text', what: 'Ein extra Hallo für eine Person' },
      { cmd: '-posuser @name', what: 'Der Bot geht dahin, wo die Person steht' },
      { cmd: '-stoppos @name', what: 'Damit aufhören' },
      { cmd: '-posbot 6 0 8', what: 'Den Bot an eine Stelle schicken' },
    ],
    mod: [
      { cmd: '!help', what: 'Alle Chat-Wörter zeigen' },
      { cmd: '!warn @name', what: 'Eine Verwarnung geben' },
      { cmd: '!mute @name / !unmute @name', what: 'Jemanden stumm / wieder laut machen' },
      { cmd: '!kick @name', what: 'Jemanden aus dem Raum schicken' },
      { cmd: '!ban @name / !unban @name', what: 'Jemanden sperren / wieder reinlassen' },
      { cmd: '!report @name Grund', what: 'Den Helfern ein Problem melden' },
      { cmd: '!go Ort', what: 'Zu einem Ort springen' },
      { cmd: '!tp @name Ort', what: 'Jemanden zu einem Ort schicken' },
      { cmd: '!setrole @name vip', what: 'Jemanden zu Admin, Moderator oder VIP machen' },
      { cmd: '!addvipzone', what: 'VIP-Bereich da machen, wo du stehst' },
      { cmd: '!posbot', what: 'Der Bot kommt zu dir' },
      { cmd: '!dance 5', what: 'Den Bot tanzen lassen' },
    ],
    music: [
      { cmd: '-play Lied  (-p)', what: 'Ein Lied dazutun' },
      { cmd: '-playtop Lied  (-pt)', what: 'Ein Lied als Nächstes spielen' },
      { cmd: '-skip  (-s)', what: 'Lied überspringen' },
      { cmd: '-queue  (-q)', what: 'Die nächsten Lieder zeigen' },
      { cmd: '-np', what: 'Das Lied jetzt zeigen' },
      { cmd: '-volup / -voldown', what: 'Lauter / leiser' },
      { cmd: '-clearqueue', what: 'Alle nächsten Lieder entfernen' },
      { cmd: '!autoplay on / off', what: 'Weiterspielen, wenn die Liste leer ist' },
      { cmd: '-add_dj @name', what: 'Jemanden zum DJ machen' },
      { cmd: '-block @name / -unblock @name', what: 'Liedwünsche sperren oder erlauben' },
    ],
  },
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
      steps: ['🤖 اضغط «خذ مكان البوت» لتنسخ مكان وقوف البوت.', '🚶 أو: امشِ إلى هناك في Highrise واكتب ‎!posbot‎ – سيأتي البوت إليك.', '🔄 ثم ارجع إلى هنا واضغط «خذ مكان البوت».'],
    },
    stand: {
      title: 'حرّك البوت بسهولة',
      steps: ['📱 ادخل غرفتك في Highrise.', '🚶 قف حيث تريد أن يقف البوت.', '💬 اكتب كلمة الدردشة في الأسفل.', '✅ يمشي البوت إليك.'],
    },
  },
  why: {
    kind: 'لكل بوت مهمة واحدة. يمكنك صنع المزيد لاحقًا.',
    name: 'الاسم يساعدك على إيجاد البوت.',
    room: 'يجب أن يعرف البوت أي غرفة يدخل.',
    token: 'يعطي Highrise كل بوت مفتاحًا خاصًا به. به يستطيع البوت الدخول. نحفظه بأمان ولا نعرضه مرة أخرى.',
    designer: 'بدون صلاحية Designer لا يسمح Highrise للبوت بالدخول.',
    messages: 'هذا ما يقوله البوت للضيوف الجدد.',
    owner: 'صاحب الغرفة يستطيع استخدام كل كلمات الدردشة.',
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
  ],
  commands: {
    welcome: [
      { cmd: '-welcome @name text', what: 'ترحيب خاص لشخص واحد' },
      { cmd: '-posuser @name', what: 'يذهب البوت إلى مكان هذا الشخص' },
      { cmd: '-stoppos @name', what: 'إيقاف ذلك' },
      { cmd: '-posbot 6 0 8', what: 'إرسال البوت إلى مكان' },
    ],
    mod: [
      { cmd: '!help', what: 'عرض كل كلمات الدردشة' },
      { cmd: '!warn @name', what: 'إعطاء تحذير' },
      { cmd: '!mute @name / !unmute @name', what: 'إسكات شخص / السماح له بالكلام' },
      { cmd: '!kick @name', what: 'إخراج شخص من الغرفة' },
      { cmd: '!ban @name / !unban @name', what: 'حظر شخص / إرجاعه' },
      { cmd: '!report @name reason', what: 'إخبار المساعدين بمشكلة' },
      { cmd: '!go place', what: 'الانتقال إلى مكان' },
      { cmd: '!tp @name place', what: 'إرسال شخص إلى مكان' },
      { cmd: '!setrole @name vip', what: 'جعل شخص مشرفًا أو VIP' },
      { cmd: '!addvipzone', what: 'صنع منطقة VIP حيث تقف' },
      { cmd: '!posbot', what: 'يأتي البوت إليك' },
      { cmd: '!dance 5', what: 'جعل البوت يرقص' },
    ],
    music: [
      { cmd: '-play song  (-p)', what: 'إضافة أغنية' },
      { cmd: '-playtop song  (-pt)', what: 'تشغيل أغنية بعد الحالية' },
      { cmd: '-skip  (-s)', what: 'تخطي الأغنية' },
      { cmd: '-queue  (-q)', what: 'عرض الأغاني القادمة' },
      { cmd: '-np', what: 'عرض الأغنية الآن' },
      { cmd: '-volup / -voldown', what: 'أعلى / أخفض' },
      { cmd: '-clearqueue', what: 'حذف كل الأغاني القادمة' },
      { cmd: '!autoplay on / off', what: 'الاستمرار عندما تفرغ القائمة' },
      { cmd: '-add_dj @name', what: 'جعل شخص DJ' },
      { cmd: '-block @name / -unblock @name', what: 'منع أو السماح بطلب الأغاني' },
    ],
  },
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
  get commands() { return PACKS[getLang()].commands; },
  get fix() { return PACKS[getLang()].fix; },
};

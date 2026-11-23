// Alle Chat-Wörter (Befehle im Highrise-Raum) wie auf der Webseite (howto.ts Abschnitte 10–12 und 14, Bot-Seiten),
// mit „Wer darf das?“. Ein Eintrag = ein Befehl, mit Text in Englisch, Deutsch und Arabisch.
// Bewusst ohne Gold-Beträge (App-Store-Regel): Ticket-Preise stehen hier nicht.
import type { BotKind } from '@/api';
import type { Lang } from './i18n';

export type CmdKind = BotKind | 'bank';
export type CmdWho = 'everyone' | 'vip' | 'dj' | 'mod' | 'admin' | 'owner' | 'helpers' | 'dm';
export type Command = { cmd: string; what: string; who: CmdWho };

type Row = { cmd: string; who: CmdWho; en: string; de: string; ar: string };

const TABLE: Record<CmdKind, Row[]> = {
  welcome: [
    { cmd: '-welcome @name text', who: 'helpers', en: 'A special hello for one person', de: 'Ein extra Hallo für eine Person', ar: 'ترحيب خاص لشخص واحد' },
    { cmd: '-posuser @name', who: 'helpers', en: 'Tell the helpers where this person walks', de: 'Den Helfern sagen, wohin die Person geht', ar: 'إخبار المساعدين أين يمشي هذا الشخص' },
    { cmd: '-stoppos @name', who: 'helpers', en: 'Stop that', de: 'Damit aufhören', ar: 'إيقاف ذلك' },
    { cmd: '-posbot 6 0 8', who: 'helpers', en: 'Send the bot to a spot (x y z) and keep it there', de: 'Den Bot an eine Stelle schicken (x y z) und merken', ar: 'إرسال البوت إلى مكان (x y z) وحفظه' },
    { cmd: 'H @name', who: 'everyone', en: 'The bot sends 50 hearts to someone', de: 'Der Bot schickt jemandem 50 Herzen', ar: 'يرسل البوت 50 قلبًا لشخص' },
  ],
  mod: [
    { cmd: '!help', who: 'everyone', en: 'Show all chat words', de: 'Alle Chat-Wörter zeigen', ar: 'عرض كل كلمات الدردشة' },
    { cmd: '!role @name', who: 'everyone', en: 'Show what someone is (VIP, moderator …)', de: 'Zeigen, was jemand ist (VIP, Moderator …)', ar: 'عرض دور شخص (VIP، مشرف …)' },
    { cmd: '!dances', who: 'everyone', en: 'List all dances', de: 'Alle Tänze zeigen', ar: 'عرض كل الرقصات' },
    { cmd: '!dance 5', who: 'everyone', en: 'Do dance number 5', de: 'Tanz Nummer 5 machen', ar: 'أداء الرقصة رقم 5' },
    { cmd: '!loop 5  /  !stoploop', who: 'everyone', en: 'Dance again and again / stop', de: 'Immer wieder tanzen / aufhören', ar: 'الرقص مرارًا / التوقف' },
    { cmd: '!report @name reason', who: 'everyone', en: 'Tell the helpers about a problem', de: 'Den Helfern ein Problem melden', ar: 'إخبار المساعدين بمشكلة' },
    { cmd: '!go place', who: 'vip', en: 'Jump to a place (or just type the place name)', de: 'Zu einem Ort springen (oder nur den Ortsnamen schreiben)', ar: 'الانتقال إلى مكان (أو اكتب اسم المكان فقط)' },
    { cmd: '!warn @name reason', who: 'mod', en: 'Give a warning (3 warnings = out of the room)', de: 'Verwarnen (3 Verwarnungen = raus aus dem Raum)', ar: 'إعطاء تحذير (3 تحذيرات = خروج من الغرفة)' },
    { cmd: '!warns @name  /  !clearwarns @name', who: 'mod', en: 'Show / remove someone’s warnings', de: 'Verwarnungen zeigen / löschen', ar: 'عرض / حذف تحذيرات شخص' },
    { cmd: '!mute @name  /  !unmute @name', who: 'mod', en: 'Make someone quiet / talk again', de: 'Jemanden stumm / wieder laut machen', ar: 'إسكات شخص / السماح له بالكلام' },
    { cmd: '!kick @name', who: 'mod', en: 'Send someone out of the room', de: 'Jemanden aus dem Raum schicken', ar: 'إخراج شخص من الغرفة' },
    { cmd: '!ban @name  /  !unban @name', who: 'mod', en: 'Block someone / let them back', de: 'Jemanden sperren / wieder reinlassen', ar: 'حظر شخص / إرجاعه' },
    { cmd: '!tp @name place', who: 'mod', en: 'Send someone to a place', de: 'Jemanden zu einem Ort schicken', ar: 'إرسال شخص إلى مكان' },
    { cmd: 'B @name', who: 'mod', en: 'Bring someone to you', de: 'Jemanden zu dir holen', ar: 'إحضار شخص إليك' },
    { cmd: 'P @name  /  F @name', who: 'mod', en: 'Freeze someone / let them move again', de: 'Jemanden einfrieren / wieder laufen lassen', ar: 'تجميد شخص / السماح له بالحركة' },
    { cmd: '!posuser @name  /  !untrack @name', who: 'mod', en: 'Watch where someone walks / stop', de: 'Beobachten, wohin jemand geht / aufhören', ar: 'مراقبة أين يمشي شخص / إيقاف' },
    { cmd: '!tip1  /  !tip5', who: 'mod', en: 'The bot gives every guest a small tip from its own gold (guests land in the guest list)', de: 'Der Bot gibt jedem Gast ein kleines Trinkgeld aus seinem eigenen Gold (Gäste kommen in die Gästeliste)', ar: 'يعطي البوت كل ضيف بقشيشًا صغيرًا من ذهبه (يدخل الضيوف قائمة الضيوف)' },
    { cmd: '!wallet', who: 'mod', en: 'Show the bot’s own gold', de: 'Das eigene Gold des Bots zeigen', ar: 'عرض ذهب البوت نفسه' },
    { cmd: '!setrole @name vip', who: 'admin', en: 'Make someone admin, moderator or VIP', de: 'Jemanden zu Admin, Moderator oder VIP machen', ar: 'جعل شخص مديرًا أو مشرفًا أو VIP' },
    { cmd: '!addword word ban  /  !removeword word', who: 'admin', en: 'Add / remove a bad word', de: 'Böses Wort dazu / weg', ar: 'إضافة / حذف كلمة ممنوعة' },
    { cmd: '!inviteall', who: 'admin', en: 'Invite everyone from the guest list', de: 'Alle aus der Gästeliste einladen', ar: 'دعوة كل من في قائمة الضيوف' },
    { cmd: '!addvipzone', who: 'admin', en: 'Make a VIP area where you stand', de: 'VIP-Bereich da machen, wo du stehst', ar: 'صنع منطقة VIP حيث تقف' },
    { cmd: '!setvipsafe', who: 'admin', en: 'Where people land who are not VIP', de: 'Wohin Leute kommen, die nicht VIP sind', ar: 'المكان الذي يذهب إليه من ليس VIP' },
    { cmd: '!posbot', who: 'admin', en: 'The bot comes to you and stays there', de: 'Der Bot kommt zu dir und bleibt da', ar: 'يأتي البوت إليك ويبقى هناك' },
    { cmd: '!reload', who: 'admin', en: 'The bot loads your newest settings now', de: 'Der Bot lädt deine neuen Einstellungen sofort', ar: 'يحمّل البوت إعداداتك الجديدة الآن' },
  ],
  music: [
    { cmd: '-play song', who: 'everyone', en: 'Wish for a song (uses 1 ticket)', de: 'Ein Lied wünschen (kostet 1 Ticket)', ar: 'طلب أغنية (تستخدم تذكرة واحدة)' },
    { cmd: '-gift @name song', who: 'everyone', en: 'Give someone a song (uses 1 of your tickets)', de: 'Jemandem ein Lied schenken (1 deiner Tickets)', ar: 'إهداء أغنية لشخص (تذكرة من تذاكرك)' },
    { cmd: '-queue  (-q)', who: 'everyone', en: 'Show the next 10 songs', de: 'Die nächsten 10 Lieder zeigen', ar: 'عرض الأغاني العشر القادمة' },
    { cmd: '-np', who: 'everyone', en: 'Show the song playing now', de: 'Das Lied zeigen, das gerade läuft', ar: 'عرض الأغنية التي تعمل الآن' },
    { cmd: '-tk', who: 'everyone', en: 'How many tickets do I have?', de: 'Wie viele Tickets habe ich?', ar: 'كم تذكرة لدي؟' },
    { cmd: '-mypos  (-pos)', who: 'everyone', en: 'Show where you stand (x y z)', de: 'Zeigen, wo du stehst (x y z)', ar: 'عرض مكان وقوفك (x y z)' },
    { cmd: 'sub  /  unsubscribe', who: 'dm', en: 'Get the song list as a direct message / stop', de: 'Liederliste als Direktnachricht bekommen / aufhören', ar: 'استلام قائمة الأغاني برسالة خاصة / إيقاف' },
    { cmd: '-p song', who: 'vip', en: 'Wish for a song without a ticket', de: 'Ein Lied ohne Ticket wünschen', ar: 'طلب أغنية بدون تذكرة' },
    { cmd: '-playtop song  (-pt)', who: 'vip', en: 'Play a song next', de: 'Ein Lied als Nächstes spielen', ar: 'تشغيل أغنية بعد الحالية' },
    { cmd: '-skip  (-s)', who: 'dj', en: 'Skip the song (also the person who wished it)', de: 'Lied überspringen (auch wer es gewünscht hat)', ar: 'تخطي الأغنية (وأيضًا من طلبها)' },
    { cmd: '-block @name  /  -unblock @name', who: 'mod', en: 'Stop or allow song wishes', de: 'Liedwünsche sperren oder erlauben', ar: 'منع أو السماح بطلب الأغاني' },
    { cmd: '-add_tickets @name 5  /  -remove_tickets @name 5', who: 'mod', en: 'Give or take tickets', de: 'Tickets geben oder wegnehmen', ar: 'إعطاء أو أخذ تذاكر' },
    { cmd: '-showtickets @name', who: 'mod', en: 'Show someone’s tickets', de: 'Tickets einer Person zeigen', ar: 'عرض تذاكر شخص' },
    { cmd: '-clearqueue', who: 'mod', en: 'Remove all next songs', de: 'Alle nächsten Lieder entfernen', ar: 'حذف كل الأغاني القادمة' },
    { cmd: '!autoplay on  /  !autoplay off', who: 'mod', en: 'Keep playing your songs when the list is empty', de: 'Deine Lieder weiterspielen, wenn die Liste leer ist', ar: 'تشغيل أغانيك عندما تفرغ القائمة' },
    { cmd: '-add_dj @name  (-add_mod, -add_vip)', who: 'owner', en: 'Make someone DJ, helper or VIP', de: 'Jemanden zu DJ, Helfer oder VIP machen', ar: 'جعل شخص DJ أو مساعدًا أو VIP' },
    { cmd: '-remove_dj @name  (-remove_mod, -remove_vip)', who: 'owner', en: 'Take that away again', de: 'Das wieder wegnehmen', ar: 'إلغاء ذلك' },
    { cmd: '-set_max 8', who: 'owner', en: 'Longest song in minutes', de: 'Längstes Lied in Minuten', ar: 'أطول أغنية بالدقائق' },
    { cmd: '-volup  /  -voldown', who: 'owner', en: 'Louder / quieter', de: 'Lauter / leiser', ar: 'أعلى / أخفض' },
    { cmd: '-musicwallet', who: 'owner', en: 'Show the DJ’s own gold', de: 'Das eigene Gold des DJs zeigen', ar: 'عرض ذهب الـ DJ نفسه' },
  ],
  bank: [
    { cmd: 'code', who: 'everyone', en: 'Get your 6-letter code to connect your Highrise account', de: 'Deinen Code (6 Zeichen) zum Verbinden holen', ar: 'احصل على رمزك (6 أحرف) لربط حساب Highrise' },
    { cmd: '-wallet', who: 'everyone', en: 'Show your gold', de: 'Dein Gold zeigen', ar: 'عرض ذهبك' },
  ],
};

export function commandsFor(lang: Lang): Record<CmdKind, Command[]> {
  const out = {} as Record<CmdKind, Command[]>;
  for (const k of Object.keys(TABLE) as CmdKind[]) out[k] = TABLE[k].map((r) => ({ cmd: r.cmd, who: r.who, what: r[lang] }));
  return out;
}

// Große Bot-Karte: Gesicht (Emoji), Name, großer AN/AUS-Knopf mit klarem Wort, Restzeit mit kleinem Balken.
// Knopf: „AN“ grün · „AUS“ grau · „Braucht Hilfe“ orange (öffnet „Lass es uns beheben“) · „Moment …“ gelb.
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Bot } from '@/api';
import { powerBot, usePending } from '@/lib/query';
import { hasRuntime, timeFraction, timeLeftWords } from '@/lib/format';
import { openFixIt } from '@/lib/fixit';
import { t } from '@/lib/i18n';
import { alpha, C, glow, KIND_COLOR, KIND_EMOJI, R, S, T } from '@/lib/theme';
import { haptic } from '@/lib/ui';
import { Face, fwdIcon, Pulse, Txt } from './ui';

export type PowerLook = 'on' | 'off' | 'help' | 'wait';
export function powerLook(bot: Bot, pending: string | null): PowerLook {
  if (pending) return 'wait';
  if (bot.status === 'running') return 'on';
  if (bot.status === 'crashed') return 'help';
  return 'off';
}

// AN = volles Neon-Grün (gut erkennbar), AUS = ruhiges Grau-Blau, Braucht Hilfe = Orange, Moment = Gelb getönt
const LOOK = {
  on: { bg: C.green, fg: C.onAccent, border: C.green, word: 'power.on' as const },
  off: { bg: C.elevated, fg: C.text, border: C.borderStrong, word: 'power.off' as const },
  help: { bg: C.orange, fg: C.onAccent, border: C.orange, word: 'power.help' as const },
  wait: { bg: C.yellowSoft, fg: C.yellow, border: alpha(C.yellow, 0.5), word: 'power.wait' as const },
};

/** großer AN/AUS-Knopf eines Bots (ganze Breite) */
export function PowerButton({ bot, testID }: { bot: Bot; testID?: string }) {
  const pending = usePending(bot.kind, bot.id);
  const look = powerLook(bot, pending);
  const L = LOOK[look];
  const on = look === 'on';
  const press = () => {
    if (look === 'wait') return;
    if (look === 'help') {
      haptic.tap();
      openFixIt(bot, 'crashed');
      return;
    }
    powerBot(bot, on ? 'stop' : 'start');
  };
  const hint = look === 'on' ? t('power.tapOff') : look === 'off' ? t('power.tapOn') : look === 'help' ? t('power.tapHelp') : t('power.waitLong');
  return (
    <Pressable
      testID={testID ?? `power-${bot.kind}-${bot.id}`}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, busy: look === 'wait' }}
      accessibilityLabel={`${bot.name}: ${t(L.word)}`}
      accessibilityHint={hint}
      onPress={press}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 64, borderRadius: 32, paddingHorizontal: 10, paddingVertical: 6,
        backgroundColor: L.bg, borderWidth: 1, borderColor: L.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
        ...(look === 'on' ? glow(C.green, 0.45) : look === 'help' ? glow(C.orange, 0.4) : null),
      })}
    >
      {/* Knopf-Kreis wie bei einem Schalter: bei AN am Ende, sonst am Anfang */}
      {look !== 'on' ? <Knob look={look} /> : null}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Txt style={[T.big, { color: L.fg, textAlign: 'center', fontSize: 22, letterSpacing: 0.5 }]} numberOfLines={1}>{t(L.word)}</Txt>
        <Txt style={[T.caption, { color: L.fg, opacity: 0.85, textAlign: 'center' }]} numberOfLines={1}>{hint}</Txt>
      </View>
      {look === 'on' ? <Knob look={look} /> : null}
    </Pressable>
  );
}

function Knob({ look }: { look: PowerLook }) {
  return (
    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: look === 'off' ? C.text3 : look === 'wait' ? C.yellow : C.onAccent, alignItems: 'center', justifyContent: 'center' }}>
      {look === 'wait' ? (
        <ActivityIndicator color={C.onAccent} />
      ) : (
        <Ionicons name={look === 'help' ? 'construct' : 'power'} size={24} color={look === 'on' ? C.green : look === 'help' ? C.orange : C.bg} />
      )}
    </View>
  );
}

/** Restzeit als freundlicher Text mit kleinem Balken */
export function TimeLeft({ bot, now }: { bot: Bot; now: number }) {
  const none = !hasRuntime(bot, now);
  const f = timeFraction(bot, now);
  const color = none ? C.orange : f < 0.15 ? C.yellow : C.green;
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${t('time.title')}: ${timeLeftWords(bot, now)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Txt style={{ fontSize: 16 }}>{bot.runtime.unlimited ? '♾️' : none ? '⏳' : '⏱️'}</Txt>
        <Txt style={[T.sub, { color: none ? C.orange : C.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>{timeLeftWords(bot, now)}</Txt>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.borderSoft, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(none ? 0 : 4, f * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
      </View>
    </View>
  );
}

export function openBot(bot: Bot, page?: string) {
  if (page) router.push({ pathname: '/bot/[kind]/[id]/[page]', params: { kind: bot.kind, id: String(bot.id), page } });
  else router.push({ pathname: '/bot/[kind]/[id]', params: { kind: bot.kind, id: String(bot.id) } });
}

export function BotCard({ bot, now, index }: { bot: Bot; now: number; index: number }) {
  const pending = usePending(bot.kind, bot.id);
  const look = powerLook(bot, pending);
  const color = KIND_COLOR[bot.kind];
  return (
    <Animated.View entering={FadeInDown.duration(240).delay(Math.min(index, 6) * 40)}>
      <View
        style={{
          backgroundColor: C.card, borderRadius: R.xl, borderWidth: look === 'help' ? 2 : 1,
          borderColor: look === 'help' ? C.orange : C.cardBorder, padding: S.md, gap: S.md,
        }}
      >
        <Pressable
          testID={`bot-${bot.kind}-${bot.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${bot.name}, ${t(`kind.${bot.kind}`)}. ${t('home.open')}`}
          onPress={() => {
            haptic.tap();
            openBot(bot);
          }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.md, opacity: pressed ? 0.7 : 1 })}
        >
          <View>
            <Face emoji={KIND_EMOJI[bot.kind]} color={color} size={68} />
            <View style={{ position: 'absolute', bottom: -4, end: -4, backgroundColor: C.card, borderRadius: 12, padding: 1 }}>
              <Pulse color={look === 'on' ? C.green : look === 'help' ? C.orange : look === 'wait' ? C.yellow : C.gray} live={look === 'on' || look === 'wait'} size={10} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt auto style={[T.big, { fontSize: 21 }]} numberOfLines={2}>{bot.name}</Txt>
            <Txt style={[T.sub, { color }]} numberOfLines={1}>{t(`kind.${bot.kind}`)}</Txt>
          </View>
          <Ionicons name={fwdIcon()} size={26} color={C.text3} />
        </Pressable>
        <TimeLeft bot={bot} now={now} />
        <PowerButton bot={bot} />
      </View>
    </Animated.View>
  );
}

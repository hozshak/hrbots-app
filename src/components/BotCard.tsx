// Große Bot-Karte (wie ein Gerät in Apple Home): Symbol + Name, Status in einfachen Worten, Laufzeit, ein großer Schalter.
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Bot } from '@/api';
import { powerBot, usePending } from '@/lib/query';
import { hasRuntime, plainStatus, runtimeWords } from '@/lib/format';
import { openFixIt } from '@/lib/fixit';
import { t } from '@/lib/i18n';
import { C, S, STATUS_COLOR, T } from '@/lib/theme';
import { AppSwitch, Glass, KindIcon, StatusDot } from './ui';

export function statusColor(bot: Bot, pending: string | null) {
  return pending ? C.yellow : STATUS_COLOR[bot.status];
}

/** großer Ein/Aus-Schalter eines Bots */
export function PowerSwitch({ bot }: { bot: Bot }) {
  const pending = usePending(bot.kind, bot.id);
  const on = bot.status === 'running';
  return (
    <AppSwitch
      big
      testID={`power-${bot.kind}-${bot.id}`}
      label={`${on ? t('bots.stop') : t('bots.start')} ${bot.name}`}
      value={on}
      disabled={!!pending}
      onChange={(v) => powerBot(bot, v ? 'start' : 'stop')}
    />
  );
}

export function openBot(bot: Bot, open?: string) {
  router.push({ pathname: '/bot/[kind]/[id]', params: { kind: bot.kind, id: String(bot.id), ...(open ? { open } : {}) } });
}

export function BotCard({ bot, now, index }: { bot: Bot; now: number; index: number }) {
  const pending = usePending(bot.kind, bot.id);
  const problem = bot.status === 'crashed' && !pending;
  const noTime = !hasRuntime(bot, now);
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(Math.min(index, 6) * 40)} layout={LinearTransition.duration(200)}>
      <Glass padded={false} style={problem ? { borderColor: 'rgba(255,95,109,0.45)', borderWidth: 1 } : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: S.lg }}>
          {/* Karte und Schalter nebeneinander (nicht verschachtelt), damit beide eigenständig bedienbar sind */}
          <Pressable
            testID={`bot-${bot.kind}-${bot.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${bot.name}, ${plainStatus(bot, pending)}, ${runtimeWords(bot, now)}`}
            onPress={() => {
              openBot(bot);
              if (problem) setTimeout(() => openFixIt(bot, 'crashed'), 350);
            }}
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, opacity: pressed ? 0.7 : 1 })}
          >
            <KindIcon kind={bot.kind} size={54} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[T.headline, { fontSize: 18 }]} numberOfLines={1}>{bot.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -5 }}>
                <StatusDot status={bot.status} pending={!!pending} size={8} />
                <Text style={[T.sub, { color: statusColor(bot, pending), fontWeight: '600', flexShrink: 1 }]} numberOfLines={1}>
                  {plainStatus(bot, pending)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name={bot.runtime.unlimited ? 'infinite' : 'time-outline'} size={14} color={noTime ? C.yellow : C.text3} />
                <Text style={[T.sub, { color: noTime ? C.yellow : C.text3 }]} numberOfLines={1}>{runtimeWords(bot, now)}</Text>
              </View>
            </View>
          </Pressable>
          <PowerSwitch bot={bot} />
        </View>
      </Glass>
    </Animated.View>
  );
}

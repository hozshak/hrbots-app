// Radio/DJ-Stream in der App anhören (wie der Player auf der Webseite: Musik-Bot „Live“ und /radio).
// Ein großer Knopf: Anhören / Stopp. Kein Hintergrund-Abspielen (stoppt beim Verlassen der Seite).
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { C, R, S, T } from '@/lib/theme';
import { Txt } from './ui';

export function StreamPlayer({ url, title, sub, testID }: { url: string; title?: string; sub?: string; testID?: string }) {
  // Quelle erst beim Antippen setzen → nichts wird geladen, solange niemand zuhört
  const [on, setOn] = useState(false);
  const [failed, setFailed] = useState(false);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
  }, []);

  // Wartet der Player lange ohne zu spielen → „nichts zu hören“
  useEffect(() => {
    if (!on || status.playing) return;
    const id = setTimeout(() => setFailed(true), 15000);
    return () => clearTimeout(id);
  }, [on, status.playing]);

  const toggle = () => {
    haptic.medium();
    if (on) {
      player.pause();
      setOn(false);
      return;
    }
    setFailed(false);
    try {
      // Cache-Buster wie die Webseite (neu verbinden statt alten Puffer abspielen)
      player.replace({ uri: url + (url.includes('?') ? '&' : '?') + 't=' + Date.now() });
      player.play();
      setOn(true);
    } catch {
      setFailed(true);
    }
  };

  const loading = on && !status.playing && !failed;
  return (
    <View testID={testID} style={{ backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: on && status.playing ? C.green : C.cardBorder, padding: S.lg, gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Pressable
          testID={testID ? `${testID}-toggle` : undefined}
          accessibilityRole="button"
          accessibilityLabel={on ? t('player.stop') : t('player.play')}
          onPress={toggle}
          style={({ pressed }) => ({
            width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center',
            backgroundColor: on ? C.red : C.accent, opacity: pressed ? 0.8 : 1,
          })}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Txt style={{ fontSize: 28, color: '#fff' }} maxFontSizeMultiplier={1.2}>{on ? '⏹' : '▶️'}</Txt>}
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={T.headline}>🎧 {title ?? t('player.title')}</Txt>
          <Txt style={T.sub}>
            {failed ? t('player.offline') : loading ? t('player.loading') : on && status.playing ? `🔴 ${t('radio.live')}` : (sub ?? t('player.sub'))}
          </Txt>
        </View>
      </View>
    </View>
  );
}

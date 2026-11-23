// Gold, das der Bot selbst in Highrise hat (seine eigene Wallet) – groß auf der Bot-Seite, NUR zum Ansehen.
// Kein Ausgeben, keine Preise, kein Kauf-Hinweis (App-Store-Regel 3.1.1). `wallet` kann fehlen/null sein,
// bis der Bot es einmal gemeldet hat → „noch unbekannt“.
import { View } from 'react-native';
import type { BotDetail, BotWallet } from '@/api';
import { useNow } from '@/lib/query';
import { fmtNum, relTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { alpha, C, R, S, T } from '@/lib/theme';
import { Txt } from './ui';

/** Chat-Wort (Bindestrich wird beim Anzeigen nicht umbrochen: U+2011), mit dem der Bot sein Gold im Raum neu meldet (Begrüßer: keins – meldet es selbst, wenn er an ist) */
const REFRESH_CMD: Record<string, string | null> = { welcome: null, mod: '!wallet', music: '-musicwallet' };

export function BotGoldTile({ d }: { d: BotDetail }) {
  const now = useNow(30000);
  const wallet = (d.settings as { wallet?: BotWallet | null }).wallet ?? null;
  const known = wallet?.gold != null;
  const cmd = REFRESH_CMD[d.bot.kind];
  const value = known ? fmtNum(wallet!.gold!) : t('botgold.unknown');
  const sub = known
    ? wallet!.updated_at ? t('botgold.updated', { when: relTime(wallet!.updated_at, now) }) : null
    : cmd ? t('botgold.unknownCmd', { cmd: cmd.replace('-', '‑') }) : t('botgold.unknownHint');
  return (
    <View
      testID="bot-gold"
      accessible
      accessibilityLabel={`${t('botgold.title')}: ${value}${sub ? `. ${sub}` : ''}`}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 72, paddingVertical: S.md, paddingHorizontal: S.lg,
        backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: alpha(C.gold, known ? 0.5 : 0.25),
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: alpha(C.gold, 0.14), alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 26 }} maxFontSizeMultiplier={1.2}>🪙</Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={[T.headline, { color: C.text }]} numberOfLines={2}>
          {t('botgold.title')}:{' '}
          <Txt style={[T.headline, known ? { color: C.gold, fontSize: 22 } : { color: C.text2, fontSize: 16 }]} testID="bot-gold-value">{value}</Txt>
        </Txt>
        {sub ? <Txt style={T.caption}>{sub}</Txt> : null}
      </View>
    </View>
  );
}

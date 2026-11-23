// Chat-Wörter einer Bot-Art (Hilfe-Reiter und Bot-Seite „Hilfe“) – mit „Wer darf das?“.
import { View } from 'react-native';
import { chatWords, type CmdKind } from '@/lib/content';
import type { CmdWho } from '@/lib/commands';
import { t, type Key } from '@/lib/i18n';
import { C, R, S, T } from '@/lib/theme';
import { CodeChip, Txt } from './ui';

const WHO_COLOR: Record<CmdWho, string> = {
  everyone: C.green, vip: C.gold, dj: C.accent, mod: C.orange, admin: C.red, owner: C.red, helpers: C.accent, dm: C.text2,
};

export function CommandList({ kind, filter = '' }: { kind: CmdKind; filter?: string }) {
  const f = filter.toLowerCase();
  const list = chatWords()[kind].filter((c) => !f || c.cmd.toLowerCase().includes(f) || c.what.toLowerCase().includes(f));
  return (
    <View style={{ gap: S.sm }}>
      {list.map((c) => (
        <View key={c.cmd} style={{ backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.cardBorder, padding: S.md, gap: S.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.sm }}>
            <Txt style={[T.body, { fontWeight: '600', flex: 1 }]}>{c.what}</Txt>
            <View style={{ borderRadius: 99, borderWidth: 1, borderColor: WHO_COLOR[c.who], paddingHorizontal: 8, paddingVertical: 2 }}>
              <Txt style={[T.caption, { color: WHO_COLOR[c.who], fontWeight: '700' }]} maxFontSizeMultiplier={1.3}>{t(`cmdwho.${c.who}` as Key)}</Txt>
            </View>
          </View>
          <CodeChip text={c.cmd} />
        </View>
      ))}
    </View>
  );
}

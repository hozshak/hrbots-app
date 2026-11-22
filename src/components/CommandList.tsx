// Chat-Wörter einer Bot-Art (Hilfe-Reiter und Bot-Seite „Hilfe“).
import { View } from 'react-native';
import type { BotKind } from '@/api';
import { content } from '@/lib/content';
import { C, R, S, T } from '@/lib/theme';
import { CodeChip, Txt } from './ui';

export function CommandList({ kind, filter = '' }: { kind: BotKind; filter?: string }) {
  const f = filter.toLowerCase();
  const list = content.commands[kind].filter((c) => !f || c.cmd.toLowerCase().includes(f) || c.what.toLowerCase().includes(f));
  return (
    <View style={{ gap: S.sm }}>
      {list.map((c) => (
        <View key={c.cmd} style={{ backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.cardBorder, padding: S.md, gap: S.sm }}>
          <Txt style={[T.body, { fontWeight: '600' }]}>{c.what}</Txt>
          <CodeChip text={c.cmd} />
        </View>
      ))}
    </View>
  );
}

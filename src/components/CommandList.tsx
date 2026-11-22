// Übersicht der Chat-Befehle einer Bot-Art (Hilfe-Reiter und Bot-Seite).
import { Text, View } from 'react-native';
import type { BotKind } from '@/api';
import { content } from '@/lib/content';
import { C, mono, T } from '@/lib/theme';

export function CommandList({ kind, filter = '' }: { kind: BotKind; filter?: string }) {
  const f = filter.toLowerCase();
  const list = content.commands[kind].filter((c) => !f || c.cmd.toLowerCase().includes(f) || c.what.toLowerCase().includes(f));
  return (
    <View style={{ gap: 2 }}>
      {list.map((c) => (
        <View key={c.cmd} style={{ paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.separator, gap: 2 }}>
          <Text selectable style={{ fontFamily: mono, fontSize: 14, color: C.accent }}>{c.cmd}</Text>
          <Text style={T.callout}>{c.what}</Text>
        </View>
      ))}
    </View>
  );
}

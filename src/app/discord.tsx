// Discord-Pflicht: ohne verknüpftes Discord liefert die API 403 discord_required. Verknüpfen geht nur auf der Webseite.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SITE } from '@/api';
import { refreshMe, signOut } from '@/lib/session';
import { errorText, t } from '@/lib/i18n';
import { openUrl } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, S, T } from '@/lib/theme';
import { Backdrop, Button, Glass } from '@/components/ui';

export default function Discord() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    try {
      const me = await refreshMe();
      if (!me.user.discord_linked) toast(t('discord.stillMissing'), 'info');
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + S.xl, paddingBottom: insets.bottom + S.lg, paddingHorizontal: S.xl }}>
      <Backdrop />
      <View style={{ flex: 1, justifyContent: 'center', gap: S.xl, maxWidth: 440, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: S.md }}>
          <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: '#5865F2', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="logo-discord" size={40} color="#fff" />
          </View>
          <Text style={[T.title, { textAlign: 'center' }]}>{t('discord.title')}</Text>
        </View>
        <Glass>
          <Text style={[T.body, { color: C.text2, lineHeight: 22 }]}>{t('discord.text')}</Text>
        </Glass>
        <View style={{ gap: S.md }}>
          <Button label={t('discord.open')} icon="open-outline" onPress={() => openUrl(`${SITE}/verify`)} />
          <Button label={t('discord.check')} variant="secondary" icon="refresh" onPress={check} loading={busy} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: S.xl }}>
        <Button label={t('account.title')} variant="ghost" small onPress={() => router.push('/account')} />
        <Button label={t('account.logout')} variant="ghost" small onPress={signOut} />
      </View>
    </View>
  );
}

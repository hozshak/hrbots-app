// Discord-Pflicht: ohne verbundenes Discord liefert die API 403 discord_required. Verbinden geht im Browser:
// die App holt einen Einmal-Link (schon angemeldet), öffnet ihn und prüft nach dem Schließen von selbst.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { account } from '@/api';
import { connectDiscord, refreshMe, signOut } from '@/lib/session';
import { errorText, t } from '@/lib/i18n';
import { haptic, openUrl } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { S, T } from '@/lib/theme';
import { Button, Card, Screen, Txt } from '@/components/ui';
import { GuideSteps } from '@/components/guide';

export default function Discord() {
  const router = useRouter();
  const [busy, setBusy] = useState<'open' | 'check' | null>(null);
  const info = useQuery({ queryKey: ['discord'], queryFn: account.discord });
  const open = async () => {
    setBusy('open');
    try {
      if (await connectDiscord()) {
        haptic.success();
        toast(t('discord.linked'), 'success');
      }
    } finally {
      setBusy(null);
    }
  };
  const check = async () => {
    setBusy('check');
    try {
      const me = await refreshMe();
      if (!me.user.discord_linked) toast(t('discord.stillMissing'), 'info');
      else toast(t('discord.linked'), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  return (
    <Screen testID="discord">
      <View style={{ alignItems: 'center', gap: S.md, paddingTop: S.xl }}>
        <Txt style={{ fontSize: 64 }} maxFontSizeMultiplier={1.2}>💬</Txt>
        <Txt style={[T.title, { textAlign: 'center' }]}>{t('discord.title')}</Txt>
        <Txt style={[T.callout, { textAlign: 'center' }]}>{t('discord.text')}</Txt>
      </View>
      <Card>
        <GuideSteps steps={[t('discord.step1'), t('discord.step2'), t('discord.step3')]} />
      </Card>
      <Button label={t('discord.open')} emoji="💬" onPress={open} loading={busy === 'open'} testID="discord-open" />
      {info.data?.invite_url ? <Button label={t('discord.join')} emoji="👋" variant="secondary" onPress={() => openUrl(info.data!.invite_url!)} /> : null}
      <Button label={t('discord.check')} emoji="🔄" variant="secondary" onPress={check} loading={busy === 'check'} testID="discord-check" />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: S.md }}>
        <Button label={t('account.title')} variant="ghost" small onPress={() => router.push('/account')} />
        <Button label={t('account.logout')} variant="ghost" small onPress={signOut} />
      </View>
    </Screen>
  );
}

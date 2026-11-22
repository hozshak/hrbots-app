// Konto: Benutzername, Discord-Status, Bots je Art, Abmelden, Konto löschen, Rechtliches, App-Version.
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { account, BOT_KINDS, MOCK, SITE } from '@/api';
import { SUPPORT_DISCORD } from '@/lib/content';
import { keys } from '@/lib/query';
import { signOut, useSession } from '@/lib/session';
import { t } from '@/lib/i18n';
import { confirm, openUrl } from '@/lib/ui';
import { C, S, T } from '@/lib/theme';
import { Backdrop, Row, ScreenTitle, Section } from '@/components/ui';

export default function Account() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const me = useQuery({ queryKey: keys.me, queryFn: account.me });
  const user = me.data?.user ?? session.user;

  useEffect(() => {
    me.refetch();
  }, []);

  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const build = Application.nativeBuildVersion;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: insets.top + S.lg, gap: S.xl, paddingBottom: insets.bottom + 110 }}>
        <ScreenTitle title={t('account.title')} />
        <Section title="">
          <Row label={t('account.username')} value={user?.username ? `@${user.username}` : '–'} icon="person-outline" />
          <Row
            label={t('account.discord')}
            icon="logo-discord"
            last
            right={
              <Text style={[T.callout, { color: user?.discord_linked ? C.green : C.yellow }]}>
                {user?.discord_linked ? t('account.discordLinked') : t('account.discordMissing')}
              </Text>
            }
            onPress={user?.discord_linked ? undefined : () => openUrl(`${SITE}/verify`)}
          />
        </Section>

        {me.data ? (
          <Section title={t('account.bots')}>
            {BOT_KINDS.map((k, i) => (
              <Row
                key={k}
                label={t(`kind.${k}`)}
                value={t('account.botsOf', { count: me.data.counts[k] ?? 0, limit: me.data.limits[k] ?? 0 })}
                last={i === BOT_KINDS.length - 1}
              />
            ))}
          </Section>
        ) : null}

        <Section title={t('account.legal')}>
          <Row label={t('account.privacy')} icon="shield-outline" onPress={() => openUrl(`${SITE}/privacy`)} />
          <Row label={t('account.terms')} icon="document-text-outline" onPress={() => openUrl(`${SITE}/terms`)} />
          <Row label={t('account.imprint')} icon="business-outline" onPress={() => openUrl(`${SITE}/imprint`)} />
          <Row label={t('account.website')} icon="globe-outline" onPress={() => openUrl(SITE)} />
          <Row label={t('account.support')} icon="logo-discord" onPress={() => openUrl(SUPPORT_DISCORD)} last />
        </Section>

        <Section title="">
          <Row
            label={t('account.logout')}
            icon="log-out-outline"
            onPress={async () => {
              if (await confirm(t('account.logoutConfirm'), '', t('account.logout'), false)) signOut();
            }}
          />
          <Row label={t('account.delete')} icon="trash-outline" danger last onPress={() => router.push('/delete-account')} />
        </Section>

        <Text style={[T.caption, { textAlign: 'center' }]}>
          HR Bots · {t('account.version', { v: build ? `${version} (${build})` : version })}
          {MOCK ? ` · ${t('common.demo')}` : ''}
        </Text>
      </ScrollView>
    </View>
  );
}

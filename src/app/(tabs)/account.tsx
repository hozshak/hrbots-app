// Konto: Name, Discord, Gold (nur ansehen) + Highrise-Verknüpfung, Sprache, Passwort, Radios, Nachrichten ans Team,
// Rechtliches, Abmelden, Konto löschen, Version.
// App-Store-Regel 3.1.3(f): KEIN Kaufen/Mieten/Verlängern, keine Preise, kein Hinweis, wo man etwas kaufen kann.
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { account, support, BOT_KINDS, MOCK, type Wallet, type WalletTx } from '@/api';
import { keys } from '@/lib/query';
import { connectDiscord, signOut, useSession } from '@/lib/session';
import { getLangSetting, LANG_NAMES, t, type Key } from '@/lib/i18n';
import { at, fmtNum, relTime } from '@/lib/format';
import { legalUrl } from '@/lib/content';
import { toast } from '@/lib/toast';
import { confirm, haptic, openUrl } from '@/lib/ui';
import { alpha, C, FONT, glow, KIND_EMOJI, R, S, T } from '@/lib/theme';
import { Card, ErrorState, MenuRow, Screen, SectionTitle, Txt } from '@/components/ui';
import { Expandable } from '@/components/guide';

function txWords(tx: WalletTx) {
  const k = `wallet.tx.${tx.reason}` as Key;
  const s = t(k);
  if (s !== k) return s;
  return tx.amount >= 0 ? t('wallet.tx.plus') : t('wallet.tx.minus');
}

function GoldCard({ w }: { w: Wallet }) {
  const router = useRouter();
  const goldFont = Platform.OS === 'web' ? `${FONT.displayHeavy}, system-ui` : FONT.displayHeavy;
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: R.xl, borderWidth: 1, borderColor: alpha(C.gold, 0.45), padding: S.lg, gap: S.md }, glow(C.gold, 0.18)]} testID="gold-card">
      <Txt style={[T.sub, { color: C.text2 }]}>{t('wallet.title')}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <Txt style={{ fontSize: 34 }} maxFontSizeMultiplier={1.2}>🪙</Txt>
        <Txt style={{ fontFamily: goldFont, fontSize: 38, color: C.gold }} maxFontSizeMultiplier={1.3} testID="gold-balance">{fmtNum(w.gold_balance)}</Txt>
        <Txt style={[T.headline, { color: C.gold }]}>{t('wallet.gold')}</Txt>
      </View>
      {w.highrise_linked ? (
        <Txt style={[T.sub, { color: C.green, fontWeight: '700' }]}>✅ {t('wallet.linkedAs', { name: w.highrise_username ?? '' })}</Txt>
      ) : (
        <MenuRow emoji="🤝" label={t('wallet.link')} onPress={() => router.push('/link')} testID="link-row" />
      )}
      {w.transactions.length ? (
        <Expandable title={t('wallet.history')} emoji="🧾" testID="gold-history">
          <View style={{ gap: S.sm }}>
            {w.transactions.map((tx, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44, borderBottomWidth: i < w.transactions.length - 1 ? 1 : 0, borderBottomColor: C.separator }}>
                <Txt style={[T.num, { color: tx.amount >= 0 ? C.green : C.text2, minWidth: 64 }]}>{tx.amount >= 0 ? '+' : '−'}{fmtNum(Math.abs(tx.amount))}</Txt>
                <View style={{ flex: 1 }}>
                  <Txt style={T.body}>{txWords(tx)}</Txt>
                  {tx.created_at ? <Txt style={T.caption}>{relTime(tx.created_at)}</Txt> : null}
                </View>
              </View>
            ))}
          </View>
        </Expandable>
      ) : null}
    </View>
  );
}

export default function AccountTab() {
  const router = useRouter();
  const session = useSession();
  const me = useQuery({ queryKey: keys.me, queryFn: account.me });
  const user = me.data?.user ?? session.user;
  // Gold + Nachrichten brauchen Discord (sonst 403 discord_required) → erst danach laden
  const linked = !!user?.discord_linked;
  const wallet = useQuery({ queryKey: keys.wallet, queryFn: account.wallet, enabled: linked });
  const discord = useQuery({ queryKey: ['discord'], queryFn: account.discord });
  const tickets = useQuery({ queryKey: keys.tickets, queryFn: support.list, enabled: linked });
  // „neue Antwort“ = das Team hat geantwortet (Status answered), wie die Status-Anzeige der Webseite
  const answered = (tickets.data ?? []).filter((x) => x.status === 'answered').length;

  useEffect(() => {
    me.refetch();
    discord.refetch();
    if (linked) {
      wallet.refetch();
      tickets.refetch();
    }
  }, []);

  // Web-Vorschau: expo-application kennt dort nur die package.json-Version → app.json nehmen
  const version = (Platform.OS === 'web' ? null : Application.nativeApplicationVersion) ?? Constants.expoConfig?.version ?? '1.3.0';
  const build = Platform.OS === 'web' ? null : Application.nativeBuildVersion;
  const ls = getLangSetting();

  return (
    <Screen tab title={t('account.title')} testID="account">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Txt style={{ fontSize: 44 }} maxFontSizeMultiplier={1.2}>🙂</Txt>
        <View style={{ flex: 1 }}>
          <Txt style={T.big} numberOfLines={1}>{user?.username ? at(user.username) : '–'}</Txt>
          {me.data ? (
            <Txt style={T.sub}>
              {BOT_KINDS.map((k) => `${KIND_EMOJI[k]} ${me.data.counts[k] ?? 0}/${me.data.limits[k] ?? 0}`).join('   ')}
            </Txt>
          ) : null}
        </View>
      </Card>

      {wallet.data ? <GoldCard w={wallet.data} /> : wallet.error ? <ErrorState error={wallet.error} onRetry={() => wallet.refetch()} /> : null}

      <View style={{ gap: S.sm }}>
        <MenuRow
          testID="row-discord"
          emoji="💬"
          label={t('account.discord')}
          value={linked
            ? `✅ ${discord.data?.discord_username ? t('account.discordAs', { name: discord.data.discord_username }) : t('account.discordOn')}`
            : `⚠️ ${t('account.discordOff')}`}
          onPress={linked ? undefined : async () => {
            if (await connectDiscord()) {
              haptic.success();
              toast(t('discord.linked'), 'success');
            }
          }}
        />
        <MenuRow testID="row-language" emoji="🌍" label={t('account.language')} value={ls === 'auto' ? t('lang.auto') : LANG_NAMES[ls]} onPress={() => router.push('/language')} />
        <MenuRow testID="row-password" emoji="🔒" label={t('account.password')} onPress={() => router.push('/password')} />
        <MenuRow testID="row-radios" emoji="📻" label={t('account.radios')} onPress={() => router.push('/radios')} />
        <MenuRow
          testID="row-tickets"
          emoji="💌"
          label={t('account.tickets')}
          value={answered ? `🔔 ${answered === 1 ? t('account.ticketsNew1') : t('account.ticketsNew', { n: answered })}` : null}
          onPress={() => router.push('/tickets')}
        />
      </View>

      <SectionTitle title={t('account.legal')} />
      <View style={{ gap: S.sm }}>
        <MenuRow emoji="🛡️" label={t('account.privacy')} onPress={() => openUrl(legalUrl('privacy'))} />
        <MenuRow emoji="📄" label={t('account.terms')} onPress={() => openUrl(legalUrl('terms'))} />
        <MenuRow emoji="🏢" label={t('account.imprint')} onPress={() => openUrl(legalUrl('imprint'))} />
      </View>

      <View style={{ gap: S.sm, marginTop: S.sm }}>
        <MenuRow
          testID="row-logout"
          emoji="👋"
          label={t('account.logout')}
          onPress={async () => {
            if (await confirm(t('account.logoutQ'), '', t('account.logout'), false)) signOut();
          }}
        />
        <MenuRow testID="row-delete" emoji="🗑️" label={t('account.delete')} danger onPress={() => router.push('/delete-account')} />
      </View>

      <Txt style={[T.caption, { textAlign: 'center' }]}>
        HR Bots · {t('account.version', { v: build ? `${version} (${build})` : version })}
        {MOCK ? ` · ${t('common.demo')}` : ''}
      </Txt>
    </Screen>
  );
}

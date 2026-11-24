// Konto erstellen mit Einladung (wie /register/<code> der Webseite): 1. Einladungs-Link einfügen und prüfen
// (zeigt, wie viele Bots man machen darf) · 2. Name + Passwort · Regeln annehmen → angemeldet.
// Auch per Link: hrbots://register?invite=<code>
import { useEffect, useRef, useState } from 'react';
import { View, type TextInputInstance } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, BOT_KINDS, EXTRA_LIMITS, isNewUsername, parseInvite, type InviteInfo } from '@/api';
import { signUp } from '@/lib/session';
import { legalUrl } from '@/lib/content';
import { errorText, t } from '@/lib/i18n';
import { haptic, openUrl } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, KIND_COLOR, KIND_EMOJI, R, S, T } from '@/lib/theme';
import { AppSwitch, Button, Card, Field, Note, PasteButton, Screen, Txt } from '@/components/ui';
import { pasteText } from '@/components/pages/common';

export default function Register() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string }>();
  const [link, setLink] = useState(params.invite ?? '');
  const [invite, setInvite] = useState<{ code: string; info: InviteInfo } | null>(null);
  const [checking, setChecking] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pwRef = useRef<TextInputInstance>(null);
  const pw2Ref = useRef<TextInputInstance>(null);

  const code = parseInvite(link);
  const check = async (raw = link) => {
    const c = parseInvite(raw);
    if (!c || checking) return;
    setChecking(true);
    setInviteErr(null);
    try {
      const info = await auth.invite(c);
      haptic.success();
      setInvite({ code: c, info });
    } catch (e) {
      haptic.error();
      setInviteErr(errorText(e));
    } finally {
      setChecking(false);
    }
  };
  // per Link geöffnet → gleich prüfen
  useEffect(() => {
    if (params.invite && parseInvite(params.invite)) check(params.invite);
  }, []);

  const nameOk = isNewUsername(name);
  const pwOk = pw.length >= EXTRA_LIMITS.passwordMin && pw.length <= EXTRA_LIMITS.passwordMax;
  const same = pw === pw2;
  const ready = !!invite && nameOk && pwOk && same && accept;
  const create = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await signUp({ invite: invite!.code, username: name.trim(), password: pw, accept_terms: true });
      haptic.success();
      toast(t('reg.done'), 'success', 2500);
      // die Wurzel leitet weiter (zur App oder erst zu „Discord verbinden“)
    } catch (e) {
      haptic.error();
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back={() => router.replace('/login')} keyboard title={`✨ ${t('reg.title')}`} testID="register">
      {!invite ? (
        <Card style={{ gap: S.md }}>
          <Field
            label={`💌 ${t('reg.inviteQ')}`}
            value={link}
            onChangeText={(v) => { setLink(v); setInviteErr(null); }}
            placeholder={t('reg.invitePh')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            ltr
            returnKeyType="go"
            onSubmitEditing={() => check()}
            error={inviteErr ?? (link.trim() && !code ? t('reg.inviteBad') : null)}
            right={<PasteButton testID="reg-paste" onPaste={async () => { const v = await pasteText(); if (v) { setLink(v); if (parseInvite(v)) check(v); } else toast(t('wiz.clipEmpty')); }} />}
            testID="reg-invite"
          />
          <Button label={t('reg.check')} emoji="🔎" onPress={() => check()} loading={checking} disabled={!code} testID="reg-check" />
        </Card>
      ) : (
        <>
          <Card tone="good" style={{ gap: S.md }}>
            <Txt style={T.headline}>✅ {t('reg.inviteOk')}</Txt>
            <Txt style={T.sub}>{t('reg.allowance')}</Txt>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              {BOT_KINDS.map((k) => (
                <View key={k} style={{ flex: 1, alignItems: 'center', gap: 2, backgroundColor: C.bg2, borderRadius: R.md, borderWidth: 1, borderColor: C.cardBorder, paddingVertical: S.md }}>
                  <Txt style={{ fontSize: 26 }} maxFontSizeMultiplier={1.2}>{KIND_EMOJI[k]}</Txt>
                  <Txt style={[T.big, { color: KIND_COLOR[k] }]}>{invite.info.limits[k] ?? 0}</Txt>
                  <Txt style={[T.caption, { textAlign: 'center' }]} numberOfLines={2}>{t(`kind.${k}`)}</Txt>
                </View>
              ))}
            </View>
            {invite.info.free_welcome ? <Note emoji="🎁" tone="good" text={t('reg.freeWelcome')} /> : null}
            {invite.info.discord_linked ? <Note emoji="💬" text={t('reg.discordIncluded', { p: invite.info.link_provider === 'tolobby' ? 'ToLobby' : 'Discord' })} /> : null}
            <Button label={t('reg.otherInvite')} variant="ghost" small onPress={() => { setInvite(null); setLink(''); }} />
          </Card>

          <Card style={{ gap: S.lg }}>
            <Field
              label={`🙂 ${t('reg.username')}`}
              value={name}
              onChangeText={(v) => { setName(v); setErr(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              textContentType="username"
              ltr
              maxLength={EXTRA_LIMITS.newUserMax}
              returnKeyType="next"
              onSubmitEditing={() => pwRef.current?.focus()}
              hint={t('reg.usernameHint')}
              error={name.trim() && !nameOk ? t('reg.usernameBad') : null}
              testID="reg-username"
            />
            <Field
              ref={pwRef}
              label={`🔒 ${t('reg.password')}`}
              value={pw}
              onChangeText={setPw}
              secureTextEntry
              autoCapitalize="none"
              ltr
              autoComplete="password-new"
              textContentType="newPassword"
              maxLength={EXTRA_LIMITS.passwordMax}
              returnKeyType="next"
              onSubmitEditing={() => pw2Ref.current?.focus()}
              hint={t('reg.passwordHint')}
              testID="reg-password"
            />
            <Field
              ref={pw2Ref}
              label={`🔒 ${t('reg.password2')}`}
              value={pw2}
              onChangeText={setPw2}
              secureTextEntry
              autoCapitalize="none"
              ltr
              autoComplete="password-new"
              textContentType="newPassword"
              maxLength={EXTRA_LIMITS.passwordMax}
              error={pw2 && !same ? t('reg.passwordMismatch') : null}
              testID="reg-password2"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Txt style={[T.body, { flex: 1 }]}>{t('reg.accept')}</Txt>
              <AppSwitch value={accept} onChange={setAccept} label={t('reg.accept')} testID="reg-accept" />
            </View>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Button label={t('account.terms')} emoji="📄" variant="secondary" small style={{ flex: 1 }} onPress={() => openUrl(legalUrl('terms'))} />
              <Button label={t('account.privacy')} emoji="🛡️" variant="secondary" small style={{ flex: 1 }} onPress={() => openUrl(legalUrl('privacy'))} />
            </View>
            <Txt style={T.caption}>{t('reg.age')}</Txt>
            {err ? <Note emoji="⚠️" tone="warn" text={err} /> : null}
            <Button label={t('reg.create')} emoji="🚀" onPress={create} loading={busy} disabled={!ready} testID="reg-create" />
          </Card>
        </>
      )}
      <Button label={t('reg.haveAccount')} variant="ghost" small onPress={() => router.replace('/login')} testID="reg-login" />
    </Screen>
  );
}

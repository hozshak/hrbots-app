// Anmelden. Neue Konten: mit Einladung (wie die Webseite, nur auf Einladung) → „Ich habe eine Einladung“.
import { useRef, useState } from 'react';
import { Image, View, type TextInputInstance } from 'react-native';
import { useRouter } from 'expo-router';
import { MOCK } from '@/api';
import { SUPPORT_DISCORD } from '@/lib/content';
import { signIn } from '@/lib/session';
import { errorText, t } from '@/lib/i18n';
import { haptic, openUrl } from '@/lib/ui';
import { C, glow, R, S, T } from '@/lib/theme';
import { Button, Card, Field, IconBtn, Screen, Txt } from '@/components/ui';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pw = useRef<TextInputInstance>(null);

  const submit = async () => {
    if (!username.trim() || !password || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await signIn(username, password);
      haptic.success();
    } catch (e) {
      haptic.error();
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboard right={<IconBtn icon="globe-outline" label={t('account.language')} onPress={() => router.push('/language')} testID="login-lang" />} testID="login">
      <View style={{ alignItems: 'center', gap: S.md, paddingTop: S.lg }}>
        <View style={[{ borderRadius: R.xl }, glow(C.accent, 0.4)]}><Image source={require('../../assets/images/icon.png')} style={{ width: 96, height: 96, borderRadius: R.xl }} accessibilityIgnoresInvertColors /></View>
        <Txt style={[T.hero, { textAlign: 'center' }]}>{t('login.hello')}</Txt>
        <Txt style={[T.callout, { textAlign: 'center' }]}>{t('login.sub')}</Txt>
      </View>
      <Card style={{ gap: S.lg }}>
        <Field
          label={`🙂 ${t('login.username')}`}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          ltr
          returnKeyType="next"
          onSubmitEditing={() => pw.current?.focus()}
          testID="login-username"
        />
        <Field
          ref={pw}
          label={`🔒 ${t('login.password')}`}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          ltr
          returnKeyType="go"
          onSubmitEditing={submit}
          error={err}
          testID="login-password"
        />
        <Button label={t('login.go')} emoji="🚀" onPress={submit} loading={busy} disabled={!username.trim() || !password} testID="login-submit" />
      </Card>
      <Card style={{ gap: S.md }}>
        <Txt style={[T.callout, { textAlign: 'center' }]}>{t('login.needInvite')}</Txt>
        <Button label={t('login.haveInvite')} emoji="💌" variant="secondary" onPress={() => router.push('/register')} testID="login-invite" />
        <Button label={t('login.askInvite')} emoji="💬" variant="ghost" small onPress={() => openUrl(SUPPORT_DISCORD)} />
      </Card>
      {MOCK ? <Txt style={[T.caption, { textAlign: 'center', color: C.yellow }]}>🧪 {t('common.demo')}{'\n'}{t('login.demoHint')}{'\n'}DEMO-INVITE-1234</Txt> : null}
    </Screen>
  );
}

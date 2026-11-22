// Anmelden. Keine Registrierung in der App – Konten gibt es nur per Einladung auf der Webseite.
import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOCK, SITE } from '@/api';
import { signIn } from '@/lib/session';
import { errorText, t } from '@/lib/i18n';
import { haptic, openUrl } from '@/lib/ui';
import { C, S, T } from '@/lib/theme';
import { Backdrop, Button, Field, Glass } from '@/components/ui';

export default function Login() {
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: S.xl, paddingTop: insets.top + S.xl, paddingBottom: insets.bottom + S.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: S.xl }}>
            <View style={{ alignItems: 'center', gap: S.md }}>
              <Image source={require('../../assets/images/icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} accessibilityIgnoresInvertColors />
              <Text style={T.largeTitle}>{t('login.title')}</Text>
              <Text style={T.callout}>{t('login.subtitle')}</Text>
            </View>

            <Glass>
              <View style={{ gap: S.lg }}>
                <Field
                  label={t('login.username')}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="next"
                  onSubmitEditing={() => pw.current?.focus()}
                  testID="login-username"
                />
                <Field
                  ref={pw}
                  label={t('login.password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  testID="login-password"
                />
                {err ? <Text style={[T.sub, { color: C.red }]}>{err}</Text> : null}
                <Button label={t('login.submit')} onPress={submit} loading={busy} disabled={!username.trim() || !password} testID="login-submit" />
              </View>
            </Glass>

            <Text style={[T.sub, { textAlign: 'center' }]} onPress={() => openUrl(SITE)} accessibilityRole="link">
              {t('login.noAccount')}
            </Text>
            {MOCK ? (
              <Text style={[T.caption, { textAlign: 'center', color: C.yellow }]}>
                {t('common.demo')}
                {'\n'}
                {t('login.demoHint')}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

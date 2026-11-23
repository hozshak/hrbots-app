// Konto löschen (App-Store-Pflicht 5.1.1(v)): Passwort bestätigen → POST /me/delete → abgemeldet.
import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '@/api';
import { deleteAccount } from '@/lib/session';
import { errorText, t } from '@/lib/i18n';
import { confirm, haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { S, T } from '@/lib/theme';
import { Button, Card, Field, goBack, Screen, Txt } from '@/components/ui';

export default function DeleteAccount() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!password || busy) return;
    if (!(await confirm(t('delete.confirmQ'), t('delete.text'), t('delete.confirm')))) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteAccount(password);
      haptic.success();
      toast(t('delete.done'), 'success', 3500);
    } catch (e) {
      haptic.error();
      const wrong = e instanceof ApiError && ['invalid_credentials', 'invalid_password', 'wrong_password'].includes(e.code);
      setErr(wrong ? t('delete.wrongPassword') : errorText(e));
      setBusy(false);
    }
  };

  return (
    <Screen keyboard close={() => goBack('/account')} title={t('delete.title')} testID="delete-account">
      <View style={{ alignItems: 'center' }}>
        <Txt style={{ fontSize: 64 }} maxFontSizeMultiplier={1.2}>⚠️</Txt>
      </View>
      <Card tone="bad">
        <Txt style={[T.body, { lineHeight: 24 }]}>{t('delete.text')}</Txt>
      </Card>
      <Field
        label={t('delete.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        ltr
        autoComplete="password"
        textContentType="password"
        error={err}
        returnKeyType="done"
        onSubmitEditing={submit}
        testID="delete-password"
      />
      <Button label={t('delete.confirm')} variant="danger" emoji="🗑️" onPress={submit} loading={busy} disabled={!password} testID="delete-submit" />
      <Button label={t('common.cancel')} variant="secondary" onPress={() => goBack('/account')} style={{ marginTop: S.sm }} />
    </Screen>
  );
}

// Konto löschen (App-Store-Pflicht 5.1.1(v)): Passwort bestätigen → POST /me/delete → abgemeldet.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ApiError } from '@/api';
import { deleteAccount } from '@/lib/session';
import { errorText, t } from '@/lib/i18n';
import { confirm, haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, S, T } from '@/lib/theme';
import { Backdrop, Button, Field, Glass, IconButton } from '@/components/ui';

export default function DeleteAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!password || busy) return;
    if (!(await confirm(t('delete.confirmTitle'), t('delete.text'), t('delete.confirm')))) return;
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: S.lg, paddingTop: Platform.OS === 'ios' ? S.lg : insets.top + S.md, gap: S.xl, paddingBottom: insets.bottom + 40 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton icon="close" label={t('common.close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))} />
            <Text style={T.headline}>{t('delete.title')}</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: C.redSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="warning" size={34} color={C.red} />
            </View>
          </View>
          <Glass>
            <Text style={[T.body, { color: C.text2, lineHeight: 22 }]}>{t('delete.text')}</Text>
          </Glass>
          <Field
            label={t('delete.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            error={err}
            returnKeyType="done"
            onSubmitEditing={submit}
            testID="delete-password"
          />
          <Button label={t('delete.confirm')} variant="danger" icon="trash" onPress={submit} loading={busy} disabled={!password} testID="delete-submit" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Passwort ändern: altes Passwort, neues Passwort (2×). Wie die Webseite: mindestens 4 Zeichen.
import { useRef, useState } from 'react';
import { type TextInputInstance } from 'react-native';
import { account, ApiError, EXTRA_LIMITS } from '@/api';
import { errorText, t } from '@/lib/i18n';
import { haptic } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { Button, Field, goBack, Note, Screen } from '@/components/ui';

export default function Password() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const r2 = useRef<TextInputInstance>(null);
  const r3 = useRef<TextInputInstance>(null);
  const short = next.length > 0 && next.length < EXTRA_LIMITS.passwordMin;
  const mismatch = again.length > 0 && again !== next;
  const ok = !!cur && next.length >= EXTRA_LIMITS.passwordMin && again === next;
  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await account.changePassword(cur, next);
      haptic.success();
      toast(t('password.done'), 'success');
      goBack('/account');
    } catch (e) {
      haptic.error();
      setErr(e instanceof ApiError && e.code === 'invalid_credentials' ? t('password.wrong') : errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen back keyboard title={`🔒 ${t('account.password')}`} testID="password">
      <Field label={t('password.current')} value={cur} onChangeText={setCur} secureTextEntry autoCapitalize="none" textContentType="password" autoComplete="current-password"
        returnKeyType="next" onSubmitEditing={() => r2.current?.focus()} error={err} testID="pw-current" />
      <Field ref={r2} label={t('password.new')} value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" textContentType="newPassword" autoComplete="new-password"
        returnKeyType="next" onSubmitEditing={() => r3.current?.focus()} error={short ? t('password.short', { n: EXTRA_LIMITS.passwordMin }) : null} testID="pw-new" />
      <Field ref={r3} label={t('password.again')} value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" textContentType="newPassword"
        returnKeyType="done" onSubmitEditing={submit} error={mismatch ? t('password.mismatch') : null} ok={again && !mismatch && !short ? t('password.match') : null} testID="pw-again" />
      <Note emoji="💡" text={t('password.tip')} />
      <Button label={t('password.save')} emoji="✅" onPress={submit} loading={busy} disabled={!ok} testID="pw-save" />
    </Screen>
  );
}

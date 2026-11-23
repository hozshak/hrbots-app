// Highrise-Konto verbinden: im HR-Bots-Raum etwas schreiben → der Bot flüstert einen 6-stelligen Code → hier eintippen.
// Neutral formuliert (kein Gold/Kaufen erwähnen).
import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { account, ApiError, EXTRA_LIMITS } from '@/api';
import { keys, queryClient } from '@/lib/query';
import { LINK_ROOM } from '@/lib/content';
import { errorText, t } from '@/lib/i18n';
import { at } from '@/lib/format';
import { haptic, openRoom } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, mono, S, T } from '@/lib/theme';
import { Button, Card, Empty, Field, goBack, Loading, PasteButton, Screen, Txt } from '@/components/ui';
import { GuideSteps } from '@/components/guide';
import { pasteText } from '@/components/pages/common';

export default function Link() {
  const q = useQuery({ queryKey: keys.link, queryFn: account.highriseLink });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const clean = code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, EXTRA_LIMITS.linkCode);
  const submit = async () => {
    if (clean.length !== EXTRA_LIMITS.linkCode || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await account.linkHighrise(clean);
      haptic.success();
      queryClient.setQueryData(keys.link, { linked: true, highrise_username: r.highrise_username });
      queryClient.invalidateQueries({ queryKey: keys.wallet });
      toast(t('link.done'), 'success');
    } catch (e) {
      haptic.error();
      const c = e instanceof ApiError ? e.code : '';
      setErr(c === 'invalid_code' || c === 'invalid_input' ? t('link.badCode') : c === 'code_used' ? t('link.used') : c === 'highrise_account_taken' ? t('link.taken') : c === 'already_linked' ? t('link.already') : errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen back keyboard title={`🤝 ${t('link.title')}`} testID="link">
      {q.isLoading ? (
        <Loading />
      ) : q.data?.linked ? (
        <>
          <Empty emoji="✅" title={t('link.already')} text={at(q.data.highrise_username ?? '')} />
          <Button label={t('common.done')} onPress={() => goBack('/account')} />
        </>
      ) : (
        <>
          <Txt style={T.callout}>{t('link.sub')}</Txt>
          <Card style={{ gap: S.md }}>
            <GuideSteps guide="link" />
            <Button label={t('link.openRoom')} emoji="🚪" variant="secondary" onPress={() => openRoom(LINK_ROOM)} testID="link-room" />
          </Card>
          <Field
            label={t('link.code')}
            value={clean}
            onChangeText={setCode}
            placeholder="ABC234"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            ltr
            maxLength={8}
            big
            error={err}
            returnKeyType="done"
            onSubmitEditing={submit}
            testID="link-code"
            right={<PasteButton onPaste={async () => { const v = await pasteText(); if (v) setCode(v); else toast(t('wiz.clipEmpty')); }} />}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, direction: 'ltr' }}>
            {Array.from({ length: EXTRA_LIMITS.linkCode }).map((_, i) => (
              <View key={i} style={{ width: 40, height: 48, borderRadius: 8, borderWidth: 1, borderColor: clean[i] ? C.accent : C.cardBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2 }}>
                <Txt style={{ fontFamily: mono, fontSize: 22, color: C.text }}>{clean[i] ?? ''}</Txt>
              </View>
            ))}
          </View>
          <Button label={t('link.connect')} emoji="🔗" onPress={submit} loading={busy} disabled={clean.length !== EXTRA_LIMITS.linkCode} testID="link-save" />
        </>
      )}
    </Screen>
  );
}

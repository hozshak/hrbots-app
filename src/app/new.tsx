// Geführter Assistent für einen neuen Bot: eine Frage pro Seite, großer Fortschrittsbalken, auf jeder Seite
// „Wozu brauche ich das?“ und „Zeig mir, wie“. Am Ende Übersicht + „Anlegen & starten“.
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bots, cleanUsername, isBotToken, isUsername, parseRoom, BOT_KINDS, type Bot, type BotKind } from '@/api';
import { keys, powerBot, queryClient } from '@/lib/query';
import { hasRuntime } from '@/lib/format';
import { content, CREATE_HIGHRISE, type GuideKey } from '@/lib/content';
import { errorText, t, type Key } from '@/lib/i18n';
import { haptic, openUrl } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, KIND_COLOR, R, S, T } from '@/lib/theme';
import { Backdrop, Button, Field, Glass, IconButton, KindIcon } from '@/components/ui';
import { Expandable, GuideSteps, HelpBits } from '@/components/guide';
import { TemplateChips } from '@/components/editors';

type Step = 'kind' | 'name' | 'room' | 'token' | 'designer' | 'messages' | 'owner' | 'summary';

function stepsFor(kind: BotKind | null): Step[] {
  const base: Step[] = ['kind', 'name', 'room', 'token', 'designer'];
  if (kind === 'welcome') return [...base, 'messages', 'summary'];
  if (kind === 'mod') return [...base, 'owner', 'summary'];
  return [...base, 'summary'];
}

async function readClipboard() {
  try {
    return (await Clipboard.getStringAsync()).trim();
  } catch {
    return '';
  }
}

function PasteButton({ onPaste, testID }: { onPaste: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t('wiz.paste')}
      onPress={onPaste}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, minHeight: 48, opacity: pressed ? 0.5 : 1 })}
    >
      <Ionicons name="clipboard-outline" size={18} color={C.accent} />
      <Text style={[T.sub, { color: C.accent, fontWeight: '700' }]}>{t('wiz.paste')}</Text>
    </Pressable>
  );
}

function Question({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[T.title, { fontSize: 26, lineHeight: 32 }]} accessibilityRole="header">{title}</Text>
      {sub ? <Text style={[T.callout, { fontSize: 16, lineHeight: 22 }]}>{sub}</Text> : null}
    </View>
  );
}

export default function NewBot() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<BotKind | null>(null);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [token, setToken] = useState('');
  const [designer, setDesigner] = useState<boolean | null>(null);
  const [owner, setOwner] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [step, setStep] = useState<Step>('kind');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ bot: Bot; started: boolean } | null>(null);
  const [clipHasText, setClipHasText] = useState(false);

  const steps = stepsFor(kind);
  const idx = steps.indexOf(step);
  const roomCheck = useMemo(() => parseRoom(room), [room]);
  const tokenOk = isBotToken(token);
  const msgs = messages.map((m) => m.trim()).filter(Boolean);

  // Raum-Schritt: Liegt etwas in der Zwischenablage? (ohne den Inhalt zu lesen – iOS fragt sonst nach Erlaubnis)
  useEffect(() => {
    if (step !== 'room' || Platform.OS === 'web') return;
    Clipboard.hasStringAsync().then(setClipHasText).catch(() => setClipHasText(false));
  }, [step]);

  const valid =
    step === 'kind' ? !!kind
      : step === 'name' ? name.trim().length > 0
        : step === 'room' ? roomCheck.ok
          : step === 'token' ? tokenOk
            : step === 'messages' ? msgs.length >= 2
              : step === 'owner' ? !owner.trim() || isUsername(owner)
                : true;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const go = (s: Step) => {
    setErr(null);
    setStep(s);
  };
  const next = () => {
    if (!valid) return;
    haptic.tap();
    go(steps[Math.min(idx + 1, steps.length - 1)]);
  };
  const back = () => (idx > 0 ? go(steps[idx - 1]) : close());

  const pasteRoom = async () => {
    const v = await readClipboard();
    if (!v) return toast(t('wiz.clipEmpty'), 'info');
    setRoom(v);
    if (parseRoom(v).ok) haptic.success();
    else haptic.error();
  };
  const pasteToken = async () => {
    const v = await readClipboard();
    if (!v) return toast(t('wiz.clipEmpty'), 'info');
    setToken(v);
    if (isBotToken(v)) haptic.success();
    else haptic.error();
  };

  const create = async () => {
    if (!kind) return;
    setBusy(true);
    setErr(null);
    try {
      const bot = await bots.create({
        kind,
        name: name.trim(),
        room: room.trim(),
        bot_token: token.trim(),
        ...(kind === 'welcome' ? { welcome_messages: msgs } : {}),
        ...(kind === 'mod' && owner.trim() ? { owner_username: cleanUsername(owner) } : {}),
      });
      setToken('');
      haptic.success();
      queryClient.setQueryData<Bot[]>(keys.bots, (l) => (l ? [...l, bot] : l));
      queryClient.invalidateQueries({ queryKey: keys.me });
      // nur starten, wenn Laufzeit da ist – sonst neutraler Hinweis
      const canStart = hasRuntime(bot);
      if (canStart) powerBot(bot, 'start');
      setDone({ bot, started: canStart });
    } catch (e) {
      haptic.error();
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const openBot = () => {
    if (!done) return;
    router.replace({ pathname: '/bot/[kind]/[id]', params: { kind: done.bot.kind, id: String(done.bot.id) } });
  };

  const addMessage = (text: string) => {
    const v = text.trim();
    if (!v || messages.includes(v)) return;
    haptic.select();
    setMessages((l) => [...l, v]);
  };

  // ---------- fertig ----------
  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: S.xl, paddingTop: insets.top + S.xl, paddingBottom: insets.bottom + S.xl }}>
        <Backdrop />
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1, justifyContent: 'center', gap: S.xl, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', gap: S.lg }}>
            <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: 'rgba(52,211,153,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark-circle" size={56} color={C.green} />
            </View>
            <Text style={[T.title, { fontSize: 26, textAlign: 'center' }]}>{t('wiz.doneTitle')}</Text>
            <Text style={[T.body, { color: C.text2, textAlign: 'center', lineHeight: 23 }]}>
              {done.started ? t('wiz.doneStarted') : t('wiz.doneNoRuntime')}
            </Text>
          </View>
          {designer === false ? (
            <Glass>
              <Text style={[T.headline, { marginBottom: S.md }]}>{content.guides.designer.title}</Text>
              <GuideSteps guide="designer" />
            </Glass>
          ) : null}
          <Button testID="wiz-open-bot" label={t('wiz.openBot')} icon="arrow-forward" onPress={openBot} />
        </Animated.View>
      </View>
    );
  }

  const why = (k: string) => content.why[k];
  const roomError = !roomCheck.ok && room.trim().length > 0 ? t(`room.${roomCheck.reason}` as Key) : null;

  const summaryRows: { label: string; value: string; step: Step; ok?: boolean }[] = kind
    ? [
        { label: t('wiz.sumKind'), value: t(`kind.${kind}`), step: 'kind' },
        { label: t('wiz.sumName'), value: name.trim(), step: 'name' },
        { label: t('wiz.sumRoom'), value: roomCheck.ok ? `✓ ${t('wiz.roomOk')}` : room, step: 'room' },
        { label: t('wiz.sumKey'), value: `✓ ${t('wiz.sumKeySet')}`, step: 'token' },
        { label: t('wiz.sumDesigner'), value: designer ? `✓ ${t('wiz.sumDesignerYes')}` : t('wiz.sumDesignerNo'), step: 'designer', ok: !!designer },
        ...(kind === 'welcome' ? [{ label: t('wiz.sumMessages'), value: String(msgs.length), step: 'messages' as Step }] : []),
        ...(kind === 'mod' ? [{ label: t('wiz.sumOwner'), value: owner.trim() ? `@${owner.trim().replace(/^@/, '')}` : '–', step: 'owner' as Step }] : []),
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      {/* Kopf: Zurück/Schließen, Fortschritt */}
      <View style={{ paddingTop: Platform.OS === 'ios' ? S.lg : insets.top + S.md, paddingHorizontal: S.lg, gap: S.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton testID="wiz-back" icon={idx > 0 ? 'chevron-back' : 'close'} label={idx > 0 ? t('common.back') : t('common.close')} size={44} onPress={back} />
          <Text style={[T.headline, { color: C.text2 }]}>{t('new.step', { n: idx + 1, total: steps.length })}</Text>
          {idx > 0 ? <IconButton icon="close" label={t('common.close')} size={44} onPress={close} /> : <View style={{ width: 44 }} />}
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }} accessibilityRole="progressbar">
          <View style={{ width: `${((idx + 1) / steps.length) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: C.accent }} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: S.xl, gap: S.lg }} keyboardShouldPersistTaps="handled">
          <Animated.View key={step} entering={Platform.OS === 'web' ? FadeIn.duration(180) : SlideInRight.duration(220)} style={{ gap: S.lg }}>
            {step === 'kind' ? (
              <>
                <Question title={t('wiz.kindQ')} sub={t('wiz.kindSub')} />
                {BOT_KINDS.map((k) => {
                  const on = kind === k;
                  return (
                    <Pressable
                      key={k}
                      testID={`kind-${k}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${t(`kind.${k}`)}. ${t(`kind.${k}.short`)}`}
                      onPress={() => {
                        haptic.select();
                        setKind(k);
                        // gleich weiter – eine Frage pro Seite
                        setTimeout(() => go('name'), 220);
                      }}
                    >
                      <Glass style={on ? { borderColor: KIND_COLOR[k], borderWidth: 1.5 } : undefined}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg, minHeight: 64 }}>
                          <KindIcon kind={k} size={60} />
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={[T.headline, { fontSize: 19 }]}>{t(`kind.${k}`)}</Text>
                            <Text style={[T.callout, { fontSize: 16 }]}>{t(`kind.${k}.short`)}</Text>
                          </View>
                          <Ionicons name={on ? 'checkmark-circle' : 'chevron-forward'} size={26} color={on ? KIND_COLOR[k] : C.text3} />
                        </View>
                      </Glass>
                    </Pressable>
                  );
                })}
                <HelpBits why={why('kind')} />
              </>
            ) : null}

            {step === 'name' ? (
              <>
                <Question title={t('wiz.nameQ')} sub={t('wiz.nameSub')} />
                <Field
                  value={name}
                  onChangeText={setName}
                  placeholder={t('new.namePlaceholder')}
                  maxLength={40}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={next}
                  testID="new-name"
                  accessibilityLabel={t('new.nameLabel')}
                />
                <HelpBits why={why('name')} guide="name" />
              </>
            ) : null}

            {step === 'room' ? (
              <>
                <Question title={t('wiz.roomQ')} sub={t('wiz.roomSub')} />
                {clipHasText && !room ? (
                  <Pressable onPress={pasteRoom} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.md, borderRadius: R.md, backgroundColor: C.accentSoft }}>
                    <Ionicons name="clipboard" size={20} color={C.accent} />
                    <Text style={[T.callout, { color: C.text, flex: 1 }]}>{t('wiz.clipFound')}</Text>
                  </Pressable>
                ) : null}
                <Field
                  label={t('wiz.roomLabel')}
                  value={room}
                  onChangeText={setRoom}
                  placeholder={t('new.roomPlaceholder')}
                  autoCapitalize="none"
                  keyboardType="url"
                  returnKeyType="next"
                  onSubmitEditing={next}
                  error={roomError}
                  ok={roomCheck.ok ? t('wiz.roomOk') : null}
                  testID="new-room"
                  right={<PasteButton onPaste={pasteRoom} testID="paste-room" />}
                />
                <HelpBits why={why('room')} guide="roomLink" />
              </>
            ) : null}

            {step === 'token' ? (
              <>
                <Question title={t('wiz.tokenQ')} sub={t('wiz.tokenSub')} />
                <Glass>
                  <Text style={[T.headline, { marginBottom: S.md }]}>{content.guides.token.title}</Text>
                  <GuideSteps guide="token" />
                  <Button label={t('wiz.openSite')} icon="open-outline" variant="secondary" onPress={() => openUrl(CREATE_HIGHRISE)} style={{ marginTop: S.lg }} testID="open-create" />
                </Glass>
                <Field
                  label={t('wiz.tokenLabel')}
                  value={token}
                  onChangeText={setToken}
                  placeholder={t('new.tokenPlaceholder')}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="none"
                  autoComplete="off"
                  error={token.length > 0 && !tokenOk ? t('new.tokenInvalid') : null}
                  ok={tokenOk ? t('wiz.tokenOk') : null}
                  hint={t('new.tokenPrivate')}
                  returnKeyType="next"
                  onSubmitEditing={next}
                  testID="new-token"
                  right={<PasteButton onPaste={pasteToken} testID="paste-token" />}
                />
                <HelpBits why={why('token')} />
              </>
            ) : null}

            {step === 'designer' ? (
              <>
                <Question title={t('wiz.designerQ')} sub={t('wiz.designerSub')} />
                <Glass>
                  <Text style={[T.headline, { marginBottom: S.md }]}>{content.guides.designer.title}</Text>
                  <GuideSteps guide="designer" />
                </Glass>
                <HelpBits why={why('designer')} />
              </>
            ) : null}

            {step === 'messages' ? (
              <>
                <Question title={t('wiz.messagesQ')} sub={t('wiz.messagesSub')} />
                {messages.map((m, i) => (
                  <Field
                    key={i}
                    value={m}
                    onChangeText={(v) => setMessages((list) => list.map((x, j) => (j === i ? v : x)))}
                    multiline
                    maxLength={200}
                    testID={`new-msg-${i}`}
                    right={
                      <Pressable accessibilityRole="button" accessibilityLabel={t('common.remove')} hitSlop={8} style={{ padding: 12 }} onPress={() => setMessages((l) => l.filter((_, j) => j !== i))}>
                        <Ionicons name="close-circle" size={22} color={C.text3} />
                      </Pressable>
                    }
                  />
                ))}
                <Text style={[T.sub, { color: msgs.length >= 2 ? C.green : C.yellow }]}>{t('wiz.messagesCount', { n: msgs.length })}</Text>
                <TemplateChips templates={content.templates.filter((x) => !messages.includes(x))} onPick={addMessage} />
                <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' }}>
                  <Field style={{ flex: 1 }} value={draft} onChangeText={setDraft} placeholder={t('new.messagePlaceholder')} testID="new-msg-draft" onSubmitEditing={() => { addMessage(draft); setDraft(''); }} />
                  <Button label={t('common.add')} small icon="add" variant="secondary" disabled={!draft.trim()} onPress={() => { addMessage(draft); setDraft(''); }} style={{ marginTop: 4 }} testID="new-msg-add" />
                </View>
                <HelpBits why={why('messages')} guide="messages" />
              </>
            ) : null}

            {step === 'owner' ? (
              <>
                <Question title={t('wiz.ownerQ')} sub={t('wiz.ownerSub')} />
                <Field
                  label={t('wiz.ownerLabel')}
                  value={owner}
                  onChangeText={setOwner}
                  placeholder="username"
                  autoCapitalize="none"
                  maxLength={41}
                  error={owner.trim() && !isUsername(owner) ? t('common.usernameInvalid') : null}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={next}
                  testID="new-owner"
                />
                <HelpBits why={why('owner')} guide="owner" />
              </>
            ) : null}

            {step === 'summary' ? (
              <>
                <Question title={t('wiz.summaryQ')} sub={t('wiz.summarySub')} />
                <Glass padded={false}>
                  {summaryRows.map((r, i) => (
                    <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, minHeight: 56, borderBottomWidth: i < summaryRows.length - 1 ? 0.5 : 0, borderBottomColor: C.separator }}>
                      <View style={{ flex: 1, paddingVertical: 8 }}>
                        <Text style={T.sub}>{r.label}</Text>
                        <Text style={[T.body, r.ok === false ? { color: C.yellow } : null]} numberOfLines={2}>{r.value}</Text>
                      </View>
                      <Pressable accessibilityRole="button" onPress={() => go(r.step)} hitSlop={8} style={{ padding: 8 }}>
                        <Text style={[T.sub, { color: C.accent, fontWeight: '600' }]}>{t('wiz.change')}</Text>
                      </Pressable>
                    </View>
                  ))}
                </Glass>
                {designer === false ? (
                  <Expandable title={t('fix.howDesigner')} icon="list-outline">
                    <GuideSteps guide="designer" />
                  </Expandable>
                ) : null}
              </>
            ) : null}
          </Animated.View>

          {err ? (
            <View style={{ backgroundColor: C.redSoft, borderRadius: R.md, padding: S.md }}>
              <Text style={[T.callout, { color: C.text }]}>{err}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* untere Knöpfe */}
        <View style={{ padding: S.lg, paddingBottom: insets.bottom + S.lg, gap: S.sm }}>
          {step === 'designer' ? (
            <>
              <Button testID="designer-done" label={t('wiz.designerDone')} icon="checkmark" onPress={() => { setDesigner(true); next(); }} />
              <Button testID="designer-later" label={t('wiz.designerLater')} variant="ghost" onPress={() => { setDesigner(false); next(); }} />
            </>
          ) : step === 'summary' ? (
            <Button testID="wiz-create" label={t('wiz.createStart')} icon="rocket-outline" onPress={create} loading={busy} />
          ) : step === 'kind' ? null : (
            <>
              <Button testID="new-next" label={t('common.next')} icon="arrow-forward" onPress={next} disabled={!valid} />
              {step === 'owner' ? <Button label={t('wiz.skip')} variant="ghost" onPress={() => { setOwner(''); next(); }} /> : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Neuer Bot – Assistent: EINE Frage pro Seite, großes Bild (Emoji), wenige Worte, auf jeder Seite Hilfe
// („Zeig mir, wie“ mit nummerierten Emoji-Schritten, „Einfügen“-Knöpfe). Am Ende Übersicht + „Bot machen“.
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bots, cleanUsername, isBotToken, isUsername, parseRoom, BOT_KINDS, INPUT_LIMITS, type Bot, type BotKind } from '@/api';
import { keys, powerBot, queryClient } from '@/lib/query';
import { at, hasRuntime } from '@/lib/format';
import { content, CREATE_HIGHRISE } from '@/lib/content';
import { errorText, t, type Key } from '@/lib/i18n';
import { haptic, openUrl } from '@/lib/ui';
import { toast } from '@/lib/toast';
import { C, glow, KIND_COLOR, KIND_EMOJI, R, S, T } from '@/lib/theme';
import { arrowFwd, Button, Card, Face, Field, fwdIcon, goBack, ListItem, Note, PasteButton, Screen, Templates, Txt } from '@/components/ui';
import { Expandable, GuideSteps } from '@/components/guide';
import { NameField } from '@/components/editors';

type Step = 'kind' | 'name' | 'room' | 'key' | 'designer' | 'messages' | 'owner' | 'summary';
const STEP_EMOJI: Record<Step, string> = { kind: '🤖', name: '🏷️', room: '🏠', key: '🔑', designer: '🚪', messages: '💬', owner: '👑', summary: '✅' };

function stepsFor(kind: BotKind | null): Step[] {
  const base: Step[] = ['kind', 'name', 'room', 'key', 'designer'];
  if (kind === 'welcome') return [...base, 'messages', 'summary'];
  return [...base, 'owner', 'summary'];
}

async function readClipboard() {
  try {
    return (await Clipboard.getStringAsync()).trim();
  } catch {
    return '';
  }
}

function Question({ step, title, sub }: { step: Step; title: string; sub?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: S.sm, paddingTop: S.sm }}>
      <Txt style={{ fontSize: 60 }} maxFontSizeMultiplier={1.1}>{STEP_EMOJI[step]}</Txt>
      <Txt style={[T.title, { textAlign: 'center' }]} accessibilityRole="header">{title}</Txt>
      {sub ? <Txt style={[T.callout, { textAlign: 'center' }]}>{sub}</Txt> : null}
    </View>
  );
}

export default function NewBot() {
  const router = useRouter();
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

  // Liegt etwas in der Zwischenablage? (ohne den Inhalt zu lesen – iOS fragt sonst nach Erlaubnis)
  useEffect(() => {
    if ((step !== 'room' && step !== 'key') || Platform.OS === 'web') return;
    Clipboard.hasStringAsync().then(setClipHasText).catch(() => setClipHasText(false));
  }, [step]);

  const valid =
    step === 'kind' ? !!kind
      : step === 'name' ? name.trim().length > 0
        : step === 'room' ? roomCheck.ok
          : step === 'key' ? tokenOk
            : step === 'messages' ? msgs.length >= 2
              : step === 'owner' ? !owner.trim() || isUsername(owner)
                : true;

  const close = () => goBack('/');
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

  const paste = async (set: (v: string) => void, check: (v: string) => boolean) => {
    const v = await readClipboard();
    if (!v) return toast(t('wiz.clipEmpty'), 'info');
    set(v);
    if (check(v)) haptic.success();
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
        ...(kind !== 'welcome' && owner.trim() ? { owner_username: cleanUsername(owner) } : {}),
      });
      setToken('');
      haptic.success();
      queryClient.setQueryData<Bot[]>(keys.bots, (l) => (l ? [...l, bot] : l));
      queryClient.invalidateQueries({ queryKey: keys.me });
      // nur starten, wenn Zeit da ist – sonst neutraler Hinweis
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

  // ---------- fertig ----------
  if (done) {
    return (
      <Screen testID="wiz-done">
        <Animated.View entering={FadeIn.duration(300)} style={{ gap: S.xl, paddingTop: S.xxl }}>
          <View style={{ alignItems: 'center', gap: S.lg }}>
            <Txt style={{ fontSize: 80 }} maxFontSizeMultiplier={1.1}>🎉</Txt>
            <Txt style={[T.hero, { textAlign: 'center' }]}>{t('wiz.doneTitle')}</Txt>
            <Txt style={[T.body, { color: C.text2, textAlign: 'center' }]}>{done.started ? t('wiz.doneStarted') : t('wiz.doneNoTime')}</Txt>
          </View>
          {designer === false ? (
            <Card style={{ gap: S.md }}>
              <Txt style={T.headline}>🚪 {content.guides.designer.title}</Txt>
              <GuideSteps guide="designer" />
            </Card>
          ) : null}
          <Button testID="wiz-open-bot" label={t('wiz.openBot')} icon={arrowFwd()} onPress={() => router.replace({ pathname: '/bot/[kind]/[id]', params: { kind: done.bot.kind, id: String(done.bot.id) } })} />
          {/* nächster Schritt: Bot an seinen Platz holen (Seite „Wo er steht“) */}
          <Button testID="wiz-place-bot" label={t('wiz.placeBot')} emoji="📍" variant="secondary" onPress={() => router.replace({ pathname: '/bot/[kind]/[id]/[page]', params: { kind: done.bot.kind, id: String(done.bot.id), page: 'stand' } })} />
          <Button label={t('wiz.toHome')} variant="ghost" onPress={() => router.dismissTo('/')} />
        </Animated.View>
      </Screen>
    );
  }

  const roomError = !roomCheck.ok && room.trim().length > 0 ? t(`room.${roomCheck.reason}` as Key) : null;
  const summaryRows: { emoji: string; label: string; value: string; step: Step; warn?: boolean }[] = kind
    ? [
        { emoji: KIND_EMOJI[kind], label: t('wiz.sumKind'), value: t(`kind.${kind}`), step: 'kind' },
        { emoji: '🏷️', label: t('wiz.sumName'), value: name.trim(), step: 'name' },
        { emoji: '🏠', label: t('wiz.sumRoom'), value: roomCheck.ok ? `✅ ${t('wiz.roomOk')}` : room, step: 'room' },
        { emoji: '🔑', label: t('wiz.sumKey'), value: `✅ ${t('wiz.sumKeySet')}`, step: 'key' },
        { emoji: '🚪', label: t('wiz.sumDesigner'), value: designer ? `✅ ${t('wiz.sumDesignerYes')}` : `⚠️ ${t('wiz.sumDesignerNo')}`, step: 'designer', warn: !designer },
        ...(kind === 'welcome' ? [{ emoji: '💬', label: t('wiz.sumMessages'), value: String(msgs.length), step: 'messages' as Step }] : []),
        ...(kind !== 'welcome' ? [{ emoji: '👑', label: t('wiz.sumOwner'), value: owner.trim() ? at(cleanUsername(owner)) : '–', step: 'owner' as Step }] : []),
      ]
    : [];

  const footer =
    step === 'kind' ? null : step === 'designer' ? (
      <>
        <Button testID="designer-done" label={t('wiz.designerDone')} emoji="✅" onPress={() => { setDesigner(true); next(); }} />
        <Button testID="designer-later" label={t('wiz.designerLater')} variant="secondary" small onPress={() => { setDesigner(false); next(); }} />
      </>
    ) : step === 'summary' ? (
      <Button testID="wiz-create" label={t('wiz.create')} emoji="🚀" onPress={create} loading={busy} />
    ) : (
      <>
        <Button testID="new-next" label={t('common.next')} icon={arrowFwd()} onPress={next} disabled={!valid} />
        {step === 'owner' ? <Button label={t('wiz.skip')} variant="secondary" small onPress={() => { setOwner(''); go('summary'); }} /> : null}
      </>
    );

  return (
    <Screen
      keyboard
      back={back}
      close={idx > 0 ? close : undefined}
      title={t('wiz.title')}
      sub={t('wiz.step', { n: idx + 1, total: steps.length })}
      footer={footer}
      testID="wizard"
      scrollKey={step}
    >
      {/* Fortschritt als Punkte */}
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: steps.length, now: idx + 1 }}>
        {steps.map((s, i) => (
          <View key={s} style={[{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i <= idx ? C.accent : C.borderSoft }, i === idx ? glow(C.accent, 0.5) : null]} />
        ))}
      </View>

      <Animated.View key={step} entering={FadeIn.duration(200)} style={{ gap: S.lg }}>
        {step === 'kind' ? (
          <>
            <Question step="kind" title={t('wiz.kindQ')} />
            {BOT_KINDS.map((k) => {
              const on = kind === k;
              return (
                <Pressable
                  key={k}
                  testID={`kind-${k}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${t(`kind.${k}`)}. ${t(`kind.${k}.d`)}`}
                  onPress={() => {
                    haptic.select();
                    setKind(k);
                    setTimeout(() => go('name'), 200);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row', alignItems: 'center', gap: S.lg, minHeight: 104, padding: S.lg, borderRadius: R.xl,
                      backgroundColor: pressed || on ? C.elevated : C.card, borderWidth: on ? 2 : 1, borderColor: on ? KIND_COLOR[k] : C.cardBorder,
                    },
                    on ? glow(KIND_COLOR[k], 0.35) : null,
                  ]}
                >
                  <Face emoji={KIND_EMOJI[k]} color={KIND_COLOR[k]} size={72} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt style={[T.big, { fontSize: 22 }]}>{t(`kind.${k}`)}</Txt>
                    <Txt style={[T.callout, { fontSize: 16 }]}>{t(`kind.${k}.d`)}</Txt>
                  </View>
                  <Ionicons name={on ? 'checkmark-circle' : fwdIcon()} size={30} color={on ? KIND_COLOR[k] : C.text3} />
                </Pressable>
              );
            })}
            <Note emoji="💡" text={content.why.kind} />
          </>
        ) : null}

        {step === 'name' ? (
          <>
            <Question step="name" title={t('wiz.nameQ')} sub={t('wiz.nameSub')} />
            <Field value={name} onChangeText={setName} placeholder={t('wiz.namePh')} maxLength={INPUT_LIMITS.name} autoFocus big returnKeyType="next" onSubmitEditing={next} testID="new-name" accessibilityLabel={t('wiz.nameQ')} />
            {kind ? <Templates items={content.botNames[kind]} onPick={setName} /> : null}
          </>
        ) : null}

        {step === 'room' ? (
          <>
            <Question step="room" title={t('wiz.roomQ')} sub={t('wiz.roomSub')} />
            <Button testID="paste-room-big" label={clipHasText && !room ? t('wiz.pasteNow') : t('common.paste')} emoji="📋" variant={room ? 'secondary' : 'primary'} onPress={() => paste(setRoom, (v) => parseRoom(v).ok)} />
            <Field
              label={t('wiz.roomLabel')}
              value={room}
              onChangeText={setRoom}
              placeholder="https://high.rs/room?id=…"
              autoCapitalize="none"
              keyboardType="url"
              ltr
              returnKeyType="next"
              onSubmitEditing={next}
              error={roomError}
              ok={roomCheck.ok ? t('wiz.roomOk') : null}
              testID="new-room"
            />
            <Expandable title={t('common.showMe')} emoji="👀" open={!room} testID="howto-room"><GuideSteps guide="roomLink" /></Expandable>
          </>
        ) : null}

        {step === 'key' ? (
          <>
            <Question step="key" title={t('wiz.keyQ')} sub={t('wiz.keySub')} />
            <Card style={{ gap: S.md }}>
              <Txt style={T.headline}>👀 {content.guides.token.title}</Txt>
              <GuideSteps guide="token" />
              <Button label={t('wiz.openSite')} emoji="🌐" variant="secondary" onPress={() => openUrl(CREATE_HIGHRISE)} testID="open-create" />
            </Card>
            <Button testID="paste-key-big" label={t('common.paste')} emoji="📋" variant={token ? 'secondary' : 'primary'} onPress={() => paste(setToken, isBotToken)} />
            <Field
              label={t('wiz.keyLabel')}
              value={token}
              onChangeText={setToken}
              placeholder={t('wiz.keyPh')}
              secureTextEntry
              autoCapitalize="none"
              textContentType="none"
              autoComplete="off"
              ltr
              error={token.length > 0 && !tokenOk ? t('wiz.keyBad') : null}
              ok={tokenOk ? t('wiz.keyOk') : null}
              hint={t('wiz.keyPrivate')}
              returnKeyType="next"
              onSubmitEditing={next}
              testID="new-token"
              right={<PasteButton onPaste={() => paste(setToken, isBotToken)} testID="paste-token" />}
            />
          </>
        ) : null}

        {step === 'designer' ? (
          <>
            <Question step="designer" title={t('wiz.designerQ')} sub={t('wiz.designerSub')} />
            <Card style={{ gap: S.md }}>
              <GuideSteps guide="designer" />
            </Card>
          </>
        ) : null}

        {step === 'messages' ? (
          <>
            <Question step="messages" title={t('wiz.messagesQ')} sub={t('wiz.messagesSub')} />
            <Txt style={[T.headline, { textAlign: 'center', color: msgs.length >= 2 ? C.green : C.yellow }]}>{t('wiz.messagesCount', { n: msgs.length })}</Txt>
            {messages.map((m, i) => (
              <ListItem key={`${i}-${m}`} emoji="💬" title={m} onDelete={() => setMessages((l) => l.filter((_, j) => j !== i))} testID={`new-msg-${i}`} />
            ))}
            <Templates items={content.greetings.filter((x) => !messages.includes(x))} onPick={(x) => { haptic.select(); setMessages((l) => [...l, x]); }} />
            <Field value={draft} onChangeText={setDraft} placeholder={t('say.placeholder')} maxLength={INPUT_LIMITS.message} testID="new-msg-draft"
              onSubmitEditing={() => { if (draft.trim()) { setMessages((l) => [...l, draft.trim()]); setDraft(''); } }} />
            <Button label={t('say.addOwn')} small variant="secondary" icon="add" disabled={!draft.trim()} testID="new-msg-add"
              onPress={() => { setMessages((l) => [...l, draft.trim()]); setDraft(''); }} />
            <Expandable title={t('common.showMe')} emoji="👀"><GuideSteps guide="messages" /></Expandable>
          </>
        ) : null}

        {step === 'owner' ? (
          <>
            <Question step="owner" title={t('wiz.ownerQ')} sub={t('wiz.ownerSub')} />
            <NameField value={owner} onChange={setOwner} onSubmit={next} autoFocus testID="new-owner" />
            <Note emoji="💡" text={content.why.owner} />
          </>
        ) : null}

        {step === 'summary' ? (
          <>
            <Question step="summary" title={t('wiz.summaryQ')} sub={t('wiz.summarySub')} />
            {summaryRows.map((r) => (
              <ListItem
                key={r.label}
                emoji={r.emoji}
                title={r.value}
                sub={r.label}
                right={<Button label={t('wiz.change')} small variant="secondary" onPress={() => go(r.step)} />}
              />
            ))}
            {designer === false ? (
              <Expandable title={content.guides.designer.title} emoji="🚪"><GuideSteps guide="designer" /></Expandable>
            ) : null}
          </>
        ) : null}
      </Animated.View>

      {err ? <Note emoji="😕" tone="warn" text={err} /> : null}
    </Screen>
  );
}

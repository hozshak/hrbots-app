// Wächter (Mod-Bot): Was er sagt · Helfer · Regeln · Orte · Aussehen · Aktivität.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  cleanUsername, isUsername, mod, BANNED_ACTIONS, INPUT_LIMITS, MIN_ROLES, type BannedAction, type BotDetail, type BotWallet, type MinRole,
  type ModRole, type ModSettings,
} from '@/api';
import { useNow } from '@/lib/query';
import { fmtNum, relTime } from '@/lib/format';
import { t, type Key } from '@/lib/i18n';
import { content } from '@/lib/content';
import { confirm } from '@/lib/ui';
import { C, S, T } from '@/lib/theme';
import { Button, Choice, CodeChip, Empty, ErrorState, Field, ListItem, Loading, Note, Tabs, Templates, ToggleRow, Txt } from '../ui';
import { Expandable, GuideSteps, HelpBits } from '../guide';
import { AddPanel, askDelete, MessageList, NameField, NameList, useBotChange } from '../editors';
import { num, Visitors, WatchList, XYZ } from './common';

type P = { d: BotDetail };
const sOf = (d: BotDetail) => d.settings as ModSettings;

// ---------------------------------------------------------------- Was er sagt
export function ModSay({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const { busy, run } = useBotChange('mod', id);
  return (
    <>
      <Txt style={T.callout}>{t('say.welcomeSub')}</Txt>
      <MessageList
        items={s.welcomes.map((w) => ({ id: w.id, text: w.message, target: w.target_username, active: w.active }))}
        templates={content.greetings}
        addLabel={t('say.add')}
        busy={busy}
        onAdd={(text, target) => run(() => mod.addWelcome(id, text, target))}
        onDelete={(m) => run(() => mod.removeWelcome(id, m.id))}
        onToggle={(m, active) => run(() => mod.updateWelcome(id, m.id, { active }), null)}
        onSave={(m, message) => run(() => mod.updateWelcome(id, m.id, { message }))}
      />
      <HelpBits guide="messages" />
    </>
  );
}

// ---------------------------------------------------------------- Helfer
type HelperTab = 'owner' | ModRole;
export function OwnerEditor({ owner, onSave, busy }: { owner: string; onSave: (u: string) => Promise<boolean>; busy?: boolean }) {
  const [name, setName] = useState(owner);
  useEffect(() => setName(owner), [owner]);
  const u = cleanUsername(name);
  const ok = !u || isUsername(u);
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.callout}>{t('role.owner.d')}</Txt>
      <NameField value={name} onChange={setName} label={t('role.owner')} testID="owner" />
      {u !== owner ? <Button label={t('common.save')} disabled={!ok} loading={busy} onPress={() => onSave(u)} testID="owner-save" /> : null}
    </View>
  );
}

export function ModHelpers({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const { busy, run } = useBotChange('mod', id);
  const [tab, setTab] = useState<HelperTab>('admin');
  const emoji: Record<HelperTab, string> = { owner: '👑', admin: '⭐', moderator: '🛡️', vip: '💎' };
  return (
    <>
      <Tabs<HelperTab>
        value={tab}
        onChange={setTab}
        options={(['owner', 'admin', 'moderator', 'vip'] as HelperTab[]).map((r) => ({
          value: r, emoji: emoji[r], label: t(`role.${r}` as Key), count: r === 'owner' ? undefined : s.roles[r].length,
        }))}
      />
      {tab === 'owner' ? (
        <OwnerEditor owner={s.owner_username} busy={busy} onSave={(u) => run(() => mod.setOwner(id, u))} />
      ) : (
        <>
          <Txt style={T.callout}>{t(`role.${tab}.d` as Key)}</Txt>
          <NameList
            key={tab}
            names={s.roles[tab]}
            addLabel={t('helpers.addRole', { role: t(`role.${tab}` as Key) })}
            emptyEmoji={emoji[tab]}
            busy={busy}
            testID={`role-${tab}`}
            onAdd={(u) => run(() => mod.addRole(id, tab, u))}
            onRemove={(u) => run(() => mod.removeRole(id, tab, u))}
          />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Regeln
const ACTION_EMOJI: Record<BannedAction, string> = { warn: '⚠️', mute: '🤐', kick: '👢', ban: '⛔' };
const ACTION_COLOR: Record<BannedAction, string> = { warn: C.yellow, mute: C.accent, kick: C.orange, ban: C.red };
type RulesTab = 'words' | 'muted' | 'warns' | 'reports';

export function ModRules({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const [tab, setTab] = useState<RulesTab>('words');
  const md = s.moderation ?? { mutes: [], warns: [], bans_count: 0, reports: [], logs: [] };
  const openReports = md.reports.filter((r) => r.status === 'open').length;
  return (
    <>
      <Tabs<RulesTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'words', emoji: '🚫', label: t('rules.words'), count: s.banned_words.length },
          { value: 'muted', emoji: '🤐', label: t('rules.muted'), count: md.mutes.length },
          { value: 'warns', emoji: '⚠️', label: t('rules.warns'), count: md.warns.length },
          { value: 'reports', emoji: '📣', label: t('rules.reports'), count: openReports },
        ]}
      />
      {tab === 'words' ? <BadWords d={d} /> : <ModerationList d={d} tab={tab} />}
    </>
  );
}

function BadWords({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const { busy, run } = useBotChange('mod', id);
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [action, setAction] = useState<BannedAction>('warn');
  const have = new Set(s.banned_words.map((w) => w.word));
  const add = async () => {
    const w = word.trim().toLowerCase();
    if (w && (await run(() => mod.addBannedWord(id, w, action)))) setWord('');
  };
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.callout}>{t('rules.wordsSub')}</Txt>
      {s.banned_words.length === 0 ? <Empty emoji="✨" title={t('rules.wordsEmpty')} /> : null}
      {s.banned_words.map((w) => (
        <ListItem
          key={w.word}
          emoji={ACTION_EMOJI[w.action]}
          title={w.word}
          sub={t(`action.${w.action}` as Key)}
          right={<Txt style={[T.caption, { color: ACTION_COLOR[w.action] }]}>{t(`action.${w.action}.short` as Key)}</Txt>}
          onDelete={async () => { if (await askDelete(w.word)) run(() => mod.removeBannedWord(id, w.word)); }}
        />
      ))}
      <AddPanel label={t('rules.addWord')} open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} testID="word-add">
        <Field value={word} onChangeText={setWord} placeholder={t('rules.wordPh')} autoCapitalize="none" maxLength={INPUT_LIMITS.word} autoFocus testID="word-input" />
        <Templates title={t('rules.starter')} items={content.badWords.filter((x) => !have.has(x))} onPick={(x) => setWord(x)} />
        <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>{t('rules.whatHappens')}</Txt>
        <Choice<BannedAction>
          testID="action"
          value={action}
          onChange={setAction}
          options={BANNED_ACTIONS.map((a) => ({ value: a, label: t(`action.${a}.short` as Key), emoji: ACTION_EMOJI[a], color: ACTION_COLOR[a] }))}
        />
        <Txt style={T.sub}>{t(`action.${action}` as Key)}</Txt>
        <Button label={t('common.add')} icon="add" onPress={add} disabled={!word.trim()} loading={busy} testID="word-save" />
      </AddPanel>
    </View>
  );
}

function ModerationList({ d, tab }: P & { tab: Exclude<RulesTab, 'words'> }) {
  const id = d.bot.id;
  const now = useNow(30000);
  const { busy, run } = useBotChange('mod', id);
  const m = sOf(d).moderation ?? { mutes: [], warns: [], bans_count: 0, reports: [], logs: [] };
  if (tab === 'muted') {
    if (!m.mutes.length) return <Empty emoji="🎉" title={t('rules.mutedEmpty')} />;
    return (
      <View style={{ gap: S.sm }}>
        <Txt style={T.callout}>{t('rules.mutedSub')}</Txt>
        {m.mutes.map((x) => (
          <ListItem key={x.id} emoji="🤐" title={`@${x.username}`} sub={[x.muted_by ? t('rules.by', { name: x.muted_by }) : null, relTime(x.created_at, now)].filter(Boolean).join(' · ')}
            right={<Button label={t('rules.unmute')} small variant="success" loading={busy} onPress={() => run(() => mod.unmute(id, x.username), t('rules.unmuted'))} />} />
        ))}
      </View>
    );
  }
  if (tab === 'warns') {
    if (!m.warns.length) return <Empty emoji="🎉" title={t('rules.warnsEmpty')} />;
    return (
      <View style={{ gap: S.sm }}>
        <Txt style={T.callout}>{t('rules.warnsSub')}</Txt>
        {m.warns.map((x) => (
          <ListItem key={x.username} emoji="⚠️" title={`@${x.username}`} sub={t('rules.warnCount', { n: x.count })}
            right={<Button label={t('rules.clear')} small variant="secondary" loading={busy}
              onPress={async () => { if (await confirm(t('rules.clearQ', { name: x.username }), '', t('rules.clear'), false)) run(() => mod.clearWarns(id, x.username), t('rules.cleared')); }} />} />
        ))}
      </View>
    );
  }
  const reports = [...m.reports].sort((a, b) => (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1));
  if (!reports.length) return <Empty emoji="🎉" title={t('rules.reportsEmpty')} />;
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.callout}>{t('rules.reportsSub')}</Txt>
      {m.bans_count ? <Note emoji="⛔" text={t('rules.bans', { n: m.bans_count })} /> : null}
      {reports.map((r) => (
        <ListItem
          key={r.id}
          emoji={r.status === 'open' ? '📣' : '✅'}
          muted={r.status !== 'open'}
          title={t('rules.reportLine', { from: r.reporter, who: r.reported })}
          sub={[r.reason, relTime(r.created_at, now)].filter(Boolean).join(' · ')}
          right={r.status === 'open' ? <Button label={t('rules.done')} small variant="success" loading={busy} onPress={() => run(() => mod.closeReport(id, r.id), t('rules.closed'))} /> : null}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- Orte
const MINROLE_EMOJI: Record<MinRole, string> = { everyone: '🌍', vip: '💎', moderator: '🛡️', admin: '⭐' };
type PlacesTab = 'spots' | 'vip';

export function ModPlaces({ d }: P) {
  const s = sOf(d);
  const [tab, setTab] = useState<PlacesTab>('spots');
  return (
    <>
      <Tabs<PlacesTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'spots', emoji: '🚪', label: t('places.spots'), count: s.destinations.length },
          { value: 'vip', emoji: '💎', label: t('places.vip'), count: s.vip?.zones.length },
        ]}
      />
      {tab === 'spots' ? <Spots d={d} /> : <VipZones d={d} />}
    </>
  );
}

function Spots({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const { busy, run } = useBotChange('mod', id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [who, setWho] = useState<MinRole>('everyone');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [z, setZ] = useState('');
  const ok = !!name.trim() && [x, y, z].every((v) => Number.isFinite(num(v)));
  const useBot = () => { const p = s.position; setX(String(p.x)); setY(String(p.y)); setZ(String(p.z)); };
  const have = new Set(s.destinations.map((x) => x.name));
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.callout}>{t('places.spotsSub', { go: s.commands.go })}</Txt>
      {s.destinations.length === 0 ? <Empty emoji="🗺️" title={t('places.spotsEmpty')} /> : null}
      {s.destinations.map((p) => (
        <ListItem
          key={p.id}
          emoji={MINROLE_EMOJI[p.min_role]}
          title={p.name}
          sub={`${t(`who.${p.min_role}` as Key)} · ${s.commands.go} ${p.name}`}
          onDelete={async () => { if (await askDelete(p.name)) run(() => mod.removeDestination(id, p.id)); }}
        />
      ))}
      <AddPanel label={t('places.addSpot')} open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} testID="spot-add">
        <Field label={t('places.name')} value={name} onChangeText={setName} autoCapitalize="none" maxLength={INPUT_LIMITS.destName} testID="spot-name" />
        <Templates items={content.placeNames.filter((n) => !have.has(n))} onPick={setName} />
        <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>{t('places.who')}</Txt>
        <Choice<MinRole> value={who} onChange={setWho} options={MIN_ROLES.map((r) => ({ value: r, label: t(`who.${r}` as Key), emoji: MINROLE_EMOJI[r] }))} />
        <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>{t('places.where')}</Txt>
        <Button label={t('places.useBot')} small variant="secondary" emoji="🤖" onPress={useBot} testID="spot-usebot" />
        <XYZ x={x} y={y} z={z} setX={setX} setY={setY} setZ={setZ} testID="spot" />
        <Expandable title={t('common.showMe')} emoji="👀"><GuideSteps guide="spot" /></Expandable>
        <Button label={t('common.add')} icon="add" disabled={!ok} loading={busy} testID="spot-save"
          onPress={async () => {
            if (await run(() => mod.addDestination(id, { name: name.trim().toLowerCase(), x: num(x), y: num(y), z: num(z), min_role: who }))) {
              setName(''); setX(''); setY(''); setZ(''); setWho('everyone'); setOpen(false);
            }
          }} />
      </AddPanel>
    </View>
  );
}

const SIZES = [{ r: 2, k: 'places.small' }, { r: 4, k: 'places.medium' }, { r: 7, k: 'places.large' }] as const;

function VipZones({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const zones = s.vip?.zones ?? [];
  const { busy, run } = useBotChange('mod', id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [x, setX] = useState('');
  const [z, setZ] = useState('');
  const [size, setSize] = useState<number>(4);
  const ok = !!name.trim() && Number.isFinite(num(x)) && Number.isFinite(num(z));
  const sizeWord = (r: number) => t((SIZES.find((q) => q.r >= r) ?? SIZES[2]).k);
  return (
    <View style={{ gap: S.sm }}>
      <Txt style={T.callout}>{t('places.vipSub')}</Txt>
      <Card2>
        <Txt style={T.headline}>⚡ {content.guides.vipzone.title}</Txt>
        <GuideSteps guide="vipzone" />
        <CodeChip text="!addvipzone" />
      </Card2>
      {zones.length === 0 ? <Empty emoji="💎" title={t('places.vipEmpty')} /> : null}
      {zones.map((v) => (
        <ListItem key={v.id} emoji="💎" title={v.name} sub={sizeWord(Math.abs(v.x2 - v.x1) / 2)}
          onDelete={async () => { if (await askDelete(v.name)) run(() => mod.removeVipZone(id, v.id)); }} />
      ))}
      <AddPanel label={t('places.addVip')} open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} testID="vip-add">
        <Field label={t('places.name')} value={name} onChangeText={setName} maxLength={INPUT_LIMITS.destName} testID="vip-name" />
        <Templates items={content.vipNames} onPick={setName} />
        <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>{t('places.size')}</Txt>
        <Choice<number> value={size} onChange={setSize} columns={3} options={SIZES.map((q) => ({ value: q.r, label: t(q.k), emoji: q.r === 2 ? '🔹' : q.r === 4 ? '🔷' : '🟦' }))} />
        <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>{t('places.middle')}</Txt>
        <Button label={t('places.useBot')} small variant="secondary" emoji="🤖" onPress={() => { setX(String(s.position.x)); setZ(String(s.position.z)); }} />
        <XYZ noY x={x} z={z} setX={setX} setZ={setZ} testID="vip" />
        <Button label={t('common.add')} icon="add" disabled={!ok} loading={busy} testID="vip-save"
          onPress={async () => {
            if (await run(() => mod.addVipZone(id, { name: name.trim(), x: num(x), z: num(z), radius: size }))) {
              setName(''); setX(''); setZ(''); setOpen(false);
            }
          }} />
      </AddPanel>
    </View>
  );
}

function Card2({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, padding: S.lg, gap: S.md }}>{children}</View>;
}

// ---------------------------------------------------------------- Aussehen (Outfits)
const INTERVALS = [5, 10, 30, 60];
export function ModLook({ d }: P) {
  const s = sOf(d);
  const id = d.bot.id;
  const { busy, run } = useBotChange('mod', id);
  const outfits = s.outfits?.list ?? [];
  const rotate = !!s.outfits?.rotate;
  const interval = s.outfits?.interval_minutes ?? 10;
  return (
    <>
      <Txt style={T.callout}>{t('look.sub')}</Txt>
      <ToggleRow emoji="🔄" label={t('look.rotate')} hint={t('look.rotateHint')} value={rotate} testID="look-rotate"
        onChange={(v) => run(() => mod.setOutfitSettings(id, { rotate: v }))} />
      {rotate ? (
        <>
          <Txt style={[T.sub, { fontWeight: '700', color: C.text }]}>{t('look.every')}</Txt>
          <Choice<number> columns={4} value={INTERVALS.includes(interval) ? interval : null}
            onChange={(v) => run(() => mod.setOutfitSettings(id, { interval_minutes: v }))}
            options={INTERVALS.map((m) => ({ value: m, label: m === 60 ? t('time.hour1') : t('time.mins', { n: m }) }))} />
        </>
      ) : null}
      {outfits.length === 0 ? <Empty emoji="👕" title={t('look.empty')} text={t('look.emptyText')} /> : null}
      {outfits.map((o) => (
        <ListItem key={o.id} emoji="👕" title={o.name} sub={t('look.items', { n: o.items.length })}
          onDelete={async () => { if (await askDelete(o.name)) run(() => mod.removeOutfit(id, o.id)); }} />
      ))}
      {outfits.length ? <Note emoji="🧰" text={t('look.addHint')} /> : null}
      {outfits.length > 1 ? (
        <Button label={t('look.clearAll')} variant="danger" small emoji="🗑️" loading={busy}
          onPress={async () => { if (await askDelete(t('look.allOutfits'))) run(() => mod.clearOutfits(id)); }} />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- Gold des Bots (nur Anzeige, wie die Karte „Bot Wallet“)
export function BotGold({ wallet, cmd }: { wallet?: BotWallet; cmd: string }) {
  if (!wallet) return null;
  const known = wallet.gold != null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, padding: S.md }} testID="bot-gold">
      <Txt style={{ fontSize: 28 }} maxFontSizeMultiplier={1.2}>🪙</Txt>
      <View style={{ flex: 1 }}>
        <Txt style={[T.sub, { color: C.text2 }]}>{t('botgold.title')}</Txt>
        {known ? (
          <Txt style={[T.headline, { color: C.gold }]}>
            {fmtNum(wallet.gold!)} {t('wallet.gold')}
            {wallet.updated_at ? <Txt style={T.caption}>{`  · ${t('botgold.updated', { when: relTime(wallet.updated_at) })}`}</Txt> : null}
          </Txt>
        ) : (
          <Txt style={T.sub}>{t('botgold.none', { cmd })}</Txt>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Aktivität
type ActTab = 'visitors' | 'watch' | 'log' | 'guests';
export function ModActivity({ d }: P) {
  const [tab, setTab] = useState<ActTab>('visitors');
  const now = useNow(30000);
  const logs = sOf(d).moderation?.logs ?? [];
  const guests = sOf(d).guests ?? [];
  return (
    <>
      <BotGold wallet={sOf(d).wallet} cmd="!wallet" />
      <Tabs<ActTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'visitors', emoji: '🚶', label: t('activity.visitors') },
          { value: 'watch', emoji: '👀', label: t('page.watch'), count: sOf(d).tracking?.length },
          { value: 'log', emoji: '🛡️', label: t('activity.log') },
          { value: 'guests', emoji: '🙋', label: t('activity.guests') },
        ]}
      />
      {tab === 'visitors' ? <Visitors d={d} /> : tab === 'watch' ? <WatchList d={d} /> : tab === 'log' ? (
        logs.length === 0 ? <Empty emoji="😇" title={t('activity.logEmpty')} /> : (
          <View style={{ gap: S.sm }}>
            {logs.map((l) => (
              <ListItem key={l.id} emoji={l.action === 'ban' ? '⛔' : l.action === 'kick' ? '👢' : l.action === 'mute' ? '🤐' : l.action === 'warn' ? '⚠️' : '🛡️'}
                title={t('activity.logLine', { who: l.done_by ?? '?', what: actionWord(l.action), target: l.target ?? '' })}
                sub={[l.reason, relTime(l.created_at, now)].filter(Boolean).join(' · ')} />
            ))}
          </View>
        )
      ) : guests.length === 0 ? <Empty emoji="🫥" title={t('activity.guestsEmpty')} /> : (
        <View style={{ gap: S.sm }}>
          <Txt style={T.callout}>{t('activity.guestsSub')}</Txt>
          {guests.map((g) => <ListItem key={g.username} emoji="🙋" title={`@${g.username}`} sub={g.first_seen ? t('activity.firstSeen', { when: relTime(g.first_seen, now) }) : null} />)}
        </View>
      )}
    </>
  );
}

function actionWord(a: string) {
  const k = `logaction.${a}` as Key;
  const s = t(k);
  return s === k ? a : s;
}

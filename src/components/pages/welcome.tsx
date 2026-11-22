// Begrüßer (Welcome-Bot): Was er sagt · Helfer.
import { welcome, type BotDetail, type WelcomeSettings } from '@/api';
import { t } from '@/lib/i18n';
import { content } from '@/lib/content';
import { T } from '@/lib/theme';
import { Txt } from '../ui';
import { HelpBits } from '../guide';
import { MessageList, NameList, useBotChange } from '../editors';

export function WelcomeSay({ d }: { d: BotDetail }) {
  const s = d.settings as WelcomeSettings;
  const id = d.bot.id;
  const { busy, run } = useBotChange('welcome', id);
  return (
    <>
      <Txt style={T.callout}>{t('say.welcomeSub')}</Txt>
      <MessageList
        items={s.messages.map((m) => ({ id: m.id, text: m.message, target: m.target_username, active: m.active }))}
        templates={content.greetings}
        addLabel={t('say.add')}
        minCount={2}
        busy={busy}
        onAdd={(text, target) => run(() => welcome.addMessage(id, text, target))}
        onDelete={(m) => run(() => welcome.deleteMessage(id, m.id))}
        onToggle={(m, active) => run(() => welcome.updateMessage(id, m.id, { active }), null)}
        onSave={(m, message) => run(() => welcome.updateMessage(id, m.id, { message }))}
      />
      <HelpBits guide="messages" />
    </>
  );
}

export function WelcomeHelpers({ d }: { d: BotDetail }) {
  const s = d.settings as WelcomeSettings;
  const id = d.bot.id;
  const { busy, run } = useBotChange('welcome', id);
  return (
    <>
      <Txt style={T.callout}>{t('helpers.welcomeSub')}</Txt>
      <NameList
        names={s.admins}
        addLabel={t('helpers.add')}
        emptyText={t('helpers.empty')}
        busy={busy}
        testID="admins"
        onAdd={(u) => run(() => welcome.addAdmin(id, u))}
        onRemove={(u) => run(() => welcome.removeAdmin(id, u))}
      />
    </>
  );
}

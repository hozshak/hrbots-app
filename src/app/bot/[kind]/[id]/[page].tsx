// Eine Aufgabe pro Seite (Kachel aus dem Bot-Menü).
import { type ReactNode } from 'react';
import type { BotDetail } from '@/api';
import { t } from '@/lib/i18n';
import { Empty, ErrorState, goBack, Loading, Screen } from '@/components/ui';
import { isPage, PAGE_EMOJI, pageTitle, type PageKey } from '@/components/pages/meta';
import { useBotPage } from '@/components/pages/useBotPage';
import { ExpertPage, HelpPage, StandPage, Visitors, WatchList } from '@/components/pages/common';
import { WelcomeHelpers, WelcomeSay } from '@/components/pages/welcome';
import { ModActivity, ModHelpers, ModLook, ModPlaces, ModRules, ModSay } from '@/components/pages/mod';
import { MusicActivity, MusicHelpers, MusicPlayer, MusicSay, MusicTickets } from '@/components/pages/music';

function body(d: BotDetail, p: PageKey): ReactNode {
  const k = d.bot.kind;
  switch (p) {
    case 'say':
      return k === 'welcome' ? <WelcomeSay d={d} /> : k === 'mod' ? <ModSay d={d} /> : <MusicSay d={d} />;
    case 'helpers':
      return k === 'welcome' ? <WelcomeHelpers d={d} /> : k === 'mod' ? <ModHelpers d={d} /> : <MusicHelpers d={d} />;
    case 'watch':
      return <WatchList d={d} />;
    case 'rules':
      return <ModRules d={d} />;
    case 'places':
      return <ModPlaces d={d} />;
    case 'look':
      return <ModLook d={d} />;
    case 'music':
      return <MusicPlayer d={d} />;
    case 'tickets':
      return <MusicTickets d={d} />;
    case 'stand':
      return <StandPage d={d} />;
    case 'activity':
      return k === 'mod' ? <ModActivity d={d} /> : k === 'music' ? <MusicActivity d={d} /> : <Visitors d={d} />;
    case 'help':
      return <HelpPage d={d} />;
    case 'expert':
      return <ExpertPage d={d} />;
  }
}

export default function BotPage() {
  const { kind, page, d, q, notFound, refreshing, onRefresh } = useBotPage();
  const valid = isPage(kind, page);
  return (
    <Screen
      back
      keyboard
      title={valid ? `${PAGE_EMOJI[page]} ${pageTitle(page)}` : ''}
      sub={d?.bot.name}
      onRefresh={onRefresh}
      refreshing={refreshing}
      testID={`page-${page}`}
    >
      {!valid || notFound ? (
        <Empty emoji="🤷" title={t('bot.notFound')} action={t('common.back')} onAction={() => goBack()} />
      ) : q.isLoading ? (
        <Loading />
      ) : !d ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        body(d, page)
      )}
    </Screen>
  );
}

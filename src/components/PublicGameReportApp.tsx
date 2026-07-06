import { useEffect, useState } from 'react';
import { isFirebaseConfigured } from '../config/firebase';
import { fetchPublicGameReport } from '../services/publicGameReportSync';
import { GameBoxScoreView } from './GameBoxScoreView';
import { PageHelpButton } from './PageHelpButton';
import { EmptyState } from './ui';

interface Props {
  teamCode: string;
  gameId: string;
}

export function PublicGameReportApp({ teamCode, gameId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Awaited<ReturnType<typeof fetchPublicGameReport>>>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setError('雲端尚未設定，無法載入戰報');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPublicGameReport(teamCode, gameId);
        setReport(data);
        if (!data) {
          setError('找不到此戰報，請確認連結或請主控端重新發布');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [teamCode, gameId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">載入戰報中…</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md">
          <EmptyState icon="📋" title="無法載入戰報" description={error} />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <EmptyState icon="📋" title="尚無戰報" description="主控端尚未發布此場戰報" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-field-green text-white px-4 py-4 shadow">
        <div className="max-w-lg mx-auto flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-green-100">公開戰報 · 唯讀</p>
            <h1 className="text-xl font-bold truncate">
              {report.teamName} vs {report.game.opponent}
            </h1>
            <p className="text-xs text-green-100 mt-1">
              {report.game.date}
              {report.seasonName ? ` · ${report.seasonName}` : ''}
              {' · '}
              更新於 {new Date(report.updatedAt).toLocaleString('zh-TW')}
            </p>
          </div>
          <PageHelpButton pageId="public-report" />
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        <GameBoxScoreView
          game={report.game}
          players={report.players}
          teamName={report.teamName}
          seasonName={report.seasonName}
        />
      </main>
    </div>
  );
}

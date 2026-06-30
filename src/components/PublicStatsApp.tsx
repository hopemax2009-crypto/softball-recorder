import { useEffect, useState } from 'react';
import type { PublicStatsSnapshot } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { fetchPublicStats, subscribePublicStats } from '../services/publicStatsSync';
import { normalizeTeamCode } from '../utils/teamStorage';
import { StatsView } from './StatsView';
import { Card, EmptyState } from './ui';

interface Props {
  teamCode: string;
}

export function PublicStatsApp({ teamCode }: Props) {
  const normalized = normalizeTeamCode(teamCode);
  const [snapshot, setSnapshot] = useState<PublicStatsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setError('雲端尚未設定，無法載入公開統計');
      setLoading(false);
      return;
    }

    let unsub: (() => void) | undefined;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPublicStats(normalized);
        setSnapshot(data);
        if (!data) {
          setError('找不到此隊伍的公開統計，請確認連結或請主控端重新發布');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    };

    void load();
    unsub = subscribePublicStats(normalized, (data) => {
      setSnapshot(data);
      if (data) setError('');
    });

    return () => unsub?.();
  }, [normalized]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">載入統計中…</p>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md">
          <EmptyState icon="📊" title="無法載入統計" description={error} />
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <EmptyState icon="📊" title="尚無公開統計" description="主控端尚未發布此隊伍的成績" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-field-green text-white px-4 py-4 shadow">
        <p className="text-xs text-green-100">公開統計 · 唯讀</p>
        <h1 className="text-xl font-bold">{snapshot.teamName}</h1>
        <p className="text-xs text-green-100 mt-1">
          隊伍代碼 {snapshot.teamCode} · 更新於{' '}
          {new Date(snapshot.updatedAt).toLocaleString('zh-TW')}
        </p>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {error && (
          <Card className="!p-3 bg-amber-50 border-amber-200 text-amber-800 text-sm">{error}</Card>
        )}
        <StatsView
          players={snapshot.players}
          seasons={snapshot.seasons}
          games={snapshot.games}
          hasBottomNav={false}
        />
      </main>
    </div>
  );
}

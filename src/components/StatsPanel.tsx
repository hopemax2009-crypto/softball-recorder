import { useState } from 'react';
import type { Game, Player, Season } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { publishPublicStats } from '../services/publicStatsSync';
import { buildPublicStatsUrl } from '../utils/publicStats';
import { getTeamCode, normalizeTeamCode, setTeamCode } from '../utils/teamStorage';
import { StatsView } from './StatsView';
import { Button, Card, EmptyState, Input } from './ui';

interface Props {
  players: Player[];
  seasons: Season[];
  games: Game[];
  teamName: string;
  publishedBy?: string;
}

export function StatsPanel({ players, seasons, games, teamName, publishedBy }: Props) {
  const [teamCodeInput, setTeamCodeInput] = useState(() => getTeamCode() || '');
  const [shareUrl, setShareUrl] = useState(() => {
    const code = getTeamCode();
    return code ? buildPublicStatsUrl(code) : '';
  });
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);

  const handlePublish = async () => {
    const teamCode = normalizeTeamCode(teamCodeInput);
    if (!teamCode) {
      setPublishStatus('請輸入隊伍代碼（英文小寫、數字、連字號）');
      return;
    }
    if (!isFirebaseConfigured()) {
      setPublishStatus('Firebase 尚未設定，無法發布公開統計');
      return;
    }
    if (players.length === 0) {
      setPublishStatus('尚無球員資料，無法發布');
      return;
    }

    setPublishing(true);
    setPublishStatus('');
    try {
      const now = new Date().toISOString();
      await publishPublicStats({
        teamCode,
        teamName: teamName.trim() || teamCode,
        players,
        seasons,
        games,
        updatedAt: now,
        publishedBy,
      });
      setTeamCode(teamCode);
      setTeamCodeInput(teamCode);
      const url = buildPublicStatsUrl(teamCode);
      setShareUrl(url);
      setLastPublishedAt(now);
      setPublishStatus('已發布！任何人可透過下方連結查詢統計');
    } catch (e) {
      setPublishStatus(e instanceof Error ? e.message : '發布失敗');
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setPublishStatus('連結已複製到剪貼簿');
    } catch {
      setPublishStatus('無法複製，請手動選取連結');
    }
  };

  if (players.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon="📊" title="尚無統計資料" description="請先新增球員並紀錄打席" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="space-y-3 bg-sky-50 border-sky-200">
        <div>
          <h3 className="font-semibold text-sky-900">公開統計連結</h3>
          <p className="text-xs text-sky-800 mt-1">
            發布後任何人可透過連結唯讀查看賽季／累計成績與雷達圖，無需登入。
          </p>
        </div>
        <Input
          label="隊伍代碼"
          placeholder="例：hope-softball"
          value={teamCodeInput}
          onChange={(e) => setTeamCodeInput(e.target.value)}
        />
        <p className="text-[10px] text-sky-700 -mt-2">
          將用於網址：?view=stats&amp;team=隊伍代碼（僅英文小寫、數字、連字號）
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => void handlePublish()}
            disabled={publishing}
            className="flex-1 !py-2.5"
          >
            {publishing ? '發布中…' : '發布公開統計'}
          </Button>
          {shareUrl && (
            <Button variant="secondary" onClick={() => void handleCopyLink()} className="flex-1 !py-2.5">
              複製連結
            </Button>
          )}
        </div>
        {shareUrl && (
          <div className="rounded-lg bg-white border border-sky-200 px-3 py-2">
            <p className="text-[10px] text-gray-500 mb-1">分享連結</p>
            <p className="text-xs text-sky-900 break-all select-all">{shareUrl}</p>
          </div>
        )}
        {lastPublishedAt && (
          <p className="text-[10px] text-sky-700">
            上次發布：{new Date(lastPublishedAt).toLocaleString('zh-TW')}
          </p>
        )}
        {publishStatus && (
          <p className={`text-xs ${publishStatus.includes('失敗') || publishStatus.includes('請') ? 'text-red-600' : 'text-emerald-700'}`}>
            {publishStatus}
          </p>
        )}
      </Card>

      <StatsView players={players} seasons={seasons} games={games} />
    </div>
  );
}

import { useState } from 'react';
import type { Game, Player, Season } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { publishPublicGameReport, getPublicGameReportWritePath } from '../services/publicGameReportSync';
import { buildGameBoxScore, formatGameBoxScoreText } from '../utils/gameBoxScore';
import { buildPublicGameReportUrl } from '../utils/publicGameReport';
import { getTeamCode, normalizeTeamCode } from '../utils/teamStorage';
import { GameBoxScoreView } from './GameBoxScoreView';
import { Button, Input } from './ui';

interface Props {
  game: Game;
  players: Player[];
  seasons: Season[];
  teamName: string;
  publishedBy?: string;
  onClose: () => void;
  hasBottomNav?: boolean;
}

function outcomeBadge(outcome: ReturnType<typeof buildGameBoxScore>['outcome']) {
  if (outcome === 'win') {
    return <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">勝</span>;
  }
  if (outcome === 'loss') {
    return <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">負</span>;
  }
  if (outcome === 'tie') {
    return <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">和</span>;
  }
  return null;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function GameBoxScoreSheet({
  game,
  players,
  seasons,
  teamName,
  publishedBy,
  onClose,
  hasBottomNav = true,
}: Props) {
  const box = buildGameBoxScore(game, players);
  const season = seasons.find((s) => s.id === game.seasonId);
  const seasonName = season?.name;
  const sheetBottom = hasBottomNav ? 'bottom-16' : 'bottom-0';
  const sheetMaxH = hasBottomNav ? 'max-h-[calc(100dvh-4.5rem)]' : 'max-h-[85dvh]';

  const [teamCodeInput, setTeamCodeInput] = useState(() => getTeamCode() || '');
  const [shareUrl, setShareUrl] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [publishing, setPublishing] = useState(false);

  const handleCopyText = async () => {
    const url = shareUrl || undefined;
    const text = formatGameBoxScoreText(game, players, teamName, seasonName, url);
    const ok = await copyText(text);
    setShareStatus(ok ? '戰報文字已複製，可貼到 LINE 等聊天軟體' : '無法複製，請手動選取內容');
  };

  const handlePublishLink = async () => {
    const teamCode = normalizeTeamCode(teamCodeInput);
    if (!teamCode) {
      setShareStatus('請輸入隊伍代碼（英文小寫、數字、連字號）');
      return;
    }
    if (!isFirebaseConfigured()) {
      setShareStatus('雲端尚未設定，無法發布公開連結');
      return;
    }

    setPublishing(true);
    setShareStatus('');
    try {
      await publishPublicGameReport({
        teamCode,
        teamName: teamName.trim() || teamCode,
        seasonName,
        game,
        players,
        updatedAt: new Date().toISOString(),
        publishedBy,
      });
      const url = buildPublicGameReportUrl(teamCode, game.id);
      setShareUrl(url);
      const text = formatGameBoxScoreText(game, players, teamName, seasonName, url);
      const copied = await copyText(text);
      setShareStatus(
        copied
          ? '已發布！戰報文字與連結已複製到剪貼簿'
          : `已發布！請複製連結：${url}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : '發布失敗';
      const writePath = getPublicGameReportWritePath(teamCode, game.id);
      if (msg.includes('Permission denied') || msg.includes('PERMISSION_DENIED')) {
        setShareStatus(
          `發布失敗（權限不足）。請在 Firebase 規則加入 publicGameReports 的讀寫，並確認已按「發布」。寫入路徑：${writePath}`
        );
      } else {
        setShareStatus(msg);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    const ok = await copyText(shareUrl);
    setShareStatus(ok ? '連結已複製' : '無法複製，請手動選取連結');
  };

  return (
    <>
      <button
        type="button"
        aria-label="關閉"
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />
      <div className={`fixed inset-x-0 z-[70] bg-white rounded-t-2xl shadow-2xl flex flex-col ${sheetBottom} ${sheetMaxH}`}>
        <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-field-green font-medium">單場戰報</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="text-lg font-bold truncate">vs {game.opponent}</p>
                {outcomeBadge(box.outcome)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {game.date}
                {seasonName ? ` · ${seasonName}` : ''}
                {game.location ? ` · ${game.location}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 shrink-0 rounded-full bg-gray-100 text-gray-600 font-bold text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          <GameBoxScoreView
            game={game}
            players={players}
            teamName={teamName}
            seasonName={seasonName}
          />

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-3">
            <h4 className="text-sm font-semibold text-blue-900">分享戰報</h4>
            <p className="text-xs text-blue-800">
              「複製文字」可貼到 LINE；「發布連結」會上傳至雲端，任何人開啟連結即可看完整戰報（無需登入）。
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => void handleCopyText()} className="flex-1 !py-2.5">
                複製文字
              </Button>
              <Button
                onClick={() => void handlePublishLink()}
                disabled={publishing}
                className="flex-1 !py-2.5"
              >
                {publishing ? '發布中…' : '發布連結'}
              </Button>
            </div>
            <Input
              label="隊伍代碼（發布連結用，與統計頁相同）"
              placeholder="例：hope-team"
              value={teamCodeInput}
              onChange={(e) => setTeamCodeInput(e.target.value)}
            />
            {shareUrl && (
              <div className="space-y-2">
                <p className="text-[10px] text-blue-700 break-all bg-white rounded-lg p-2 border border-blue-100">
                  {shareUrl}
                </p>
                <Button variant="secondary" onClick={() => void handleCopyLink()} className="w-full !py-2">
                  複製連結
                </Button>
              </div>
            )}
            {shareStatus && (
              <p className="text-xs text-blue-800 bg-white/80 rounded-lg py-2 px-2">{shareStatus}</p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]" />
      </div>
    </>
  );
}

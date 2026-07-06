import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { AtBat, AtBatResult, Game, HalfInning, LineupEntry, Player, Position, RecordSubTab, Season } from '../types';
import { AT_BAT_RESULTS, getDefaultOutsForResult, POSITIONS } from '../types';
import {
  applyGameAfterAtBatChange,
  getAtBatsForHalf,
  getHalfInningStats,
  getInningLabel,
  getLastOutPlayerId,
  hasActiveLineup,
  isHalfComplete,
  isOurBattingHalf,
  substitutePlayerInLineup,
} from '../utils/gameLogic';
import { getResultLabel } from '../utils/stats';
import { hasBoxScoreData } from '../utils/gameBoxScore';
import { isGameRecordDataEqual } from '../utils/gameEquals';
import type { LiveSyncState } from '../hooks/useLiveRoomSync';
import type { SharedSyncState } from '../hooks/useSharedGameSync';
import { GameBoxScoreSheet } from './GameBoxScoreSheet';
import { LineupPanel } from './LineupPanel';
import { PlayerPickerSheet } from './PlayerPickerSheet';
import { PositionPanel } from './PositionPanel';
import { Scoreboard } from './Scoreboard';
import { Button, Card, EmptyState } from './ui';

function positionLabel(pos: Position): string {
  return POSITIONS.find((p) => p.value === pos)?.label.split(' ').pop() ?? pos;
}

function getResultShort(result: AtBatResult): string {
  return AT_BAT_RESULTS.find((r) => r.value === result)?.short ?? result;
}

function formatGameAtBatSummary(atBats: AtBat[]): string {
  return atBats
    .map((a) => {
      const short = getResultShort(a.result);
      return a.rbi > 0 ? `${short}+${a.rbi}` : short;
    })
    .join('、');
}

const RESULT_COLORS: Record<string, string> = {
  '1B': 'bg-green-100 text-green-800',
  '2B': 'bg-green-200 text-green-900',
  '3B': 'bg-green-300 text-green-900',
  HR: 'bg-yellow-100 text-yellow-900',
  BB: 'bg-blue-100 text-blue-800',
  HBP: 'bg-blue-100 text-blue-800',
  SO: 'bg-red-100 text-red-800',
  FO: 'bg-gray-100 text-gray-700',
  GO: 'bg-gray-100 text-gray-700',
  DP: 'bg-indigo-100 text-indigo-900',
  SF: 'bg-orange-100 text-orange-800',
  FC: 'bg-purple-100 text-purple-800',
  E: 'bg-pink-100 text-pink-800',
};

type RecordSheetState =
  | { type: 'new'; playerId: string }
  | { type: 'edit'; atBat: AtBat }
  | null;

function ScorePicker({
  rbi,
  outs,
  onRbi,
  onOuts,
  onConfirm,
  onCancel,
  onQuick,
  quickLabel,
  title,
}: {
  rbi: number;
  outs: number;
  onRbi: (n: number) => void;
  onOuts: (n: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onQuick?: () => void;
  quickLabel?: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-center mb-3 font-medium text-base">{title}</p>
      {onQuick && (
        <button
          type="button"
          onClick={onQuick}
          className="w-full mb-3 py-3 rounded-xl bg-white border-2 border-field-green text-field-green text-sm font-bold"
        >
          {quickLabel ?? '快速：0分0出局'}
        </button>
      )}
      <p className="text-xs text-gray-500 text-center mb-2">打點</p>
      <div className="grid grid-cols-5 gap-2">
        {[0, 1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onRbi(n)}
            className={`rounded-xl min-h-[48px] text-base font-bold ${
              rbi === n ? 'bg-field-green text-white' : 'bg-white text-field-green border-2 border-field-green'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 text-center mt-4 mb-2">該打席造成出局數</p>
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onOuts(n)}
            className={`rounded-xl min-h-[48px] text-base font-bold ${
              outs === n ? 'bg-red-500 text-white' : 'bg-white text-red-500 border-2 border-red-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 bg-field-green text-white rounded-xl min-h-[48px] text-base font-bold"
        >
          確認
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 rounded-xl min-h-[48px] text-base font-bold"
        >
          取消
        </button>
      </div>
    </div>
  );
}

function RecordSheetOverlay({
  recordSheet,
  activeLineup,
  players,
  showRbiPicker,
  pendingResult,
  pendingRbi,
  pendingOuts,
  editRbi,
  editOuts,
  hasBottomNav,
  onClose,
  onResultClick,
  onPendingRbi,
  onPendingOuts,
  onQuickAdd,
  onConfirmAdd,
  onCancelRbi,
  onEditRbi,
  onEditOuts,
  onSaveEdit,
}: {
  recordSheet: RecordSheetState;
  activeLineup: Game['lineup'];
  players: Player[];
  showRbiPicker: boolean;
  pendingResult: AtBatResult | null;
  pendingRbi: number;
  pendingOuts: number;
  editRbi: number;
  editOuts: number;
  hasBottomNav: boolean;
  onClose: () => void;
  onResultClick: (result: AtBatResult) => void;
  onPendingRbi: (n: number) => void;
  onPendingOuts: (n: number) => void;
  onQuickAdd: () => void;
  onConfirmAdd: () => void;
  onCancelRbi: () => void;
  onEditRbi: (n: number) => void;
  onEditOuts: (n: number) => void;
  onSaveEdit: () => void;
}) {
  if (!recordSheet) return null;

  const sheetPlayerId = recordSheet.type === 'new' ? recordSheet.playerId : recordSheet.atBat.playerId;
  const sheetPlayer = players.find((p) => p.id === sheetPlayerId);
  const sheetEntry = activeLineup.find((l) => l.playerId === sheetPlayerId);

  const sheetBottom = hasBottomNav ? 'bottom-16' : 'bottom-0';
  const sheetMaxH = hasBottomNav ? 'max-h-[calc(100dvh-4.5rem)]' : 'max-h-[85dvh]';

  return (
    <>
      <button
        type="button"
        aria-label="關閉"
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 z-[70] bg-white rounded-t-2xl shadow-2xl overflow-hidden flex flex-col ${sheetBottom} ${sheetMaxH}`}
      >
        <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                {recordSheet.type === 'new' ? '紀錄打席' : '編輯打席'}
              </p>
              <p className="text-lg font-bold">
                {sheetEntry?.battingOrder != null && (
                  <span className="text-field-green mr-2">#{sheetEntry.battingOrder}</span>
                )}
                {sheetPlayer?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          {recordSheet.type === 'new' && !showRbiPicker && (
            <div className="grid grid-cols-3 gap-2">
              {AT_BAT_RESULTS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => onResultClick(r.value)}
                  className={`rounded-xl min-h-[52px] px-1 text-sm font-bold ${RESULT_COLORS[r.value]}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {recordSheet.type === 'new' && showRbiPicker && pendingResult && (
            <ScorePicker
              title={`${getResultLabel(pendingResult)}：請選擇打點與出局數`}
              rbi={pendingRbi}
              outs={pendingOuts}
              onRbi={onPendingRbi}
              onOuts={onPendingOuts}
              onQuick={onQuickAdd}
              quickLabel={`快速：0分${getDefaultOutsForResult(pendingResult)}出局`}
              onConfirm={onConfirmAdd}
              onCancel={onCancelRbi}
            />
          )}

          {recordSheet.type === 'edit' && (
            <ScorePicker
              title={`${getResultLabel(recordSheet.atBat.result)}：打點 / 出局數`}
              rbi={editRbi}
              outs={editOuts}
              onRbi={onEditRbi}
              onOuts={onEditOuts}
              onConfirm={onSaveEdit}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </>
  );
}

interface Props {
  players: Player[];
  activeGame: Game | null;
  seasons?: Season[];
  recorderMode?: boolean;
  hasBottomNav?: boolean;
  syncState?: SharedSyncState | LiveSyncState | null;
  onSyncNow?: () => void;
  onSelectGame: (game: Game | null) => void;
  onUpdateGame: (game: Game) => void;
  teamName?: string;
  publishedBy?: string;
}

export function RecordPanel({
  players: playersProp,
  activeGame,
  seasons = [],
  recorderMode = false,
  hasBottomNav = false,
  syncState,
  onSyncNow,
  onSelectGame,
  onUpdateGame,
  teamName = '我方',
  publishedBy,
}: Props) {
  const players = playersProp ?? [];
  const [subTab, setSubTab] = useState<RecordSubTab>('record');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [recordSheet, setRecordSheet] = useState<
    { type: 'new'; playerId: string } | { type: 'edit'; atBat: AtBat } | null
  >(null);
  const [showRbiPicker, setShowRbiPicker] = useState(false);
  const [pendingResult, setPendingResult] = useState<AtBatResult | null>(null);
  const [pendingRbi, setPendingRbi] = useState(0);
  const [pendingOuts, setPendingOuts] = useState(0);
  const [editRbi, setEditRbi] = useState(0);
  const [editOuts, setEditOuts] = useState(0);
  const [lineupPage, setLineupPage] = useState(0);
  const [pinchHitTarget, setPinchHitTarget] = useState<LineupEntry | null>(null);
  const [showBoxScore, setShowBoxScore] = useState(false);

  const activeLineup = activeGame
    ? (activeGame.lineup ?? []).filter((l) => l.isActive).sort((a, b) => a.battingOrder - b.battingOrder)
    : [];

  useEffect(() => {
    if (activeLineup.length > 0 && !selectedPlayer) {
      setSelectedPlayer(activeLineup[0].playerId);
    }
  }, [activeGame?.id, activeLineup.length, selectedPlayer]);

  useEffect(() => {
    if (!activeGame || recorderMode) return;
    setSubTab(hasActiveLineup(activeGame) ? 'record' : 'positions');
  }, [activeGame?.id, recorderMode]);

  const currentBatterIdx = activeLineup.findIndex((e) => e.playerId === selectedPlayer);
  const currentEntry = currentBatterIdx >= 0 ? activeLineup[currentBatterIdx] : null;
  const nextThreeEntries =
    currentBatterIdx >= 0 && activeLineup.length > 1
      ? Array.from({ length: Math.min(3, activeLineup.length - 1) }, (_, i) =>
          activeLineup[(currentBatterIdx + 1 + i) % activeLineup.length]
        )
      : [];
  const excludedPlayerIds = new Set([
    ...(currentEntry ? [currentEntry.playerId] : []),
    ...nextThreeEntries.map((e) => e.playerId),
  ]);
  const otherLineupEntries = activeLineup.filter((e) => !excludedPlayerIds.has(e.playerId));
  const browseLineupPageCount =
    activeLineup.length > 0 ? Math.max(1, Math.ceil(activeLineup.length / 3)) : 1;
  const otherLineupPageCount =
    otherLineupEntries.length > 0 ? Math.ceil(otherLineupEntries.length / 3) : 0;
  const pagedBrowseEntries =
    activeLineup.length === 0
      ? []
      : activeLineup.slice(lineupPage * 3, lineupPage * 3 + 3);
  const pagedOtherEntries = otherLineupEntries.slice(lineupPage * 3, lineupPage * 3 + 3);

  useEffect(() => {
    setLineupPage(0);
  }, [selectedPlayer, activeGame?.id, activeGame?.currentInning, activeGame?.currentHalf]);

  const currentHalfAtBats = activeGame
    ? getAtBatsForHalf(activeGame, activeGame.currentInning, activeGame.currentHalf)
    : [];

  const currentStats = activeGame
    ? getHalfInningStats(activeGame, activeGame.currentInning, activeGame.currentHalf)
    : null;

  const lastOutId = activeGame
    ? getLastOutPlayerId(currentHalfAtBats)
    : null;

  const isReadOnly = !!activeGame?.isCompleted;

  const guardedUpdate = (game: Game) => {
    if (isReadOnly && activeGame && game.id === activeGame.id) {
      if (!isGameRecordDataEqual(activeGame, game)) return;
    }
    onUpdateGame(game);
  };

  const canRecord =
    activeGame &&
    !isReadOnly &&
    isOurBattingHalf(activeGame, activeGame.currentInning, activeGame.currentHalf) &&
    (currentStats?.outs ?? 0) < 3;

  const closeRecordSheet = () => {
    setRecordSheet(null);
    setShowRbiPicker(false);
    setPendingResult(null);
    setPendingRbi(0);
    setPendingOuts(0);
  };

  useEffect(() => {
    if (isReadOnly) {
      closeRecordSheet();
    }
  }, [isReadOnly]);

  const openRecordForPlayer = (playerId: string) => {
    if (!canRecord) return;
    setSelectedPlayer(playerId);
    setRecordSheet({ type: 'new', playerId });
    setShowRbiPicker(false);
    setPendingResult(null);
    setPendingRbi(0);
    setPendingOuts(0);
  };

  const setAsCurrentBatter = (playerId: string) => {
    if (!canRecord) return;
    setSelectedPlayer(playerId);
    closeRecordSheet();
  };

  const canSubstitute = !isReadOnly && !!activeGame && activeLineup.length > 0;

  const handlePinchHitSelect = (newPlayerId: string | null) => {
    if (!pinchHitTarget || !activeGame || !newPlayerId) {
      setPinchHitTarget(null);
      return;
    }
    const updated = substitutePlayerInLineup(
      activeGame,
      pinchHitTarget.battingOrder,
      newPlayerId
    );
    guardedUpdate(updated);
    if (selectedPlayer === pinchHitTarget.playerId) {
      setSelectedPlayer(newPlayerId);
    }
    setPinchHitTarget(null);
  };

  const renderLineupMeta = (player: Player | undefined, entry: LineupEntry) => (
    <div className="flex items-center gap-2 flex-wrap">
      {player?.number && (
        <span className="text-xs font-bold text-sky-600">#{player.number}</span>
      )}
      {entry.position !== 'BN' && (
        <span className="text-xs font-semibold text-amber-600">{positionLabel(entry.position)}</span>
      )}
    </div>
  );

  const renderLineupRow = (
    entry: LineupEntry,
    mode: 'current' | 'upcoming' | 'browse'
  ) => {
    const player = players.find((p) => p.id === entry.playerId);
    const isLastOut = lastOutId === entry.playerId;
    const gameAtBats = activeGame
      ? activeGame.atBats.filter((a) => a.playerId === entry.playerId)
      : [];
    const gameAtBatSummary = formatGameAtBatSummary(gameAtBats);
    const cardBody = (
      <>
        <span
          className={`font-bold text-field-green shrink-0 ${mode === 'current' ? 'text-2xl w-8' : 'text-xl w-7'}`}
        >
          {entry.battingOrder}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <p className={`font-bold shrink-0 ${mode === 'current' ? 'text-lg' : 'text-base'}`}>
              {player?.name}
            </p>
            {gameAtBatSummary && (
              <span className="text-xs text-gray-400 truncate min-w-0">{gameAtBatSummary}</span>
            )}
          </div>
          {renderLineupMeta(player, entry)}
        </div>
        {mode === 'current' && (
          <span className="text-xs bg-field-green text-white px-2.5 py-1 rounded-full shrink-0">
            打擊
          </span>
        )}
        {isLastOut && (
          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full shrink-0">出局</span>
        )}
        {mode === 'current' && canRecord && (
          <span className="text-gray-300 shrink-0">›</span>
        )}
      </>
    );

    return (
      <div key={entry.playerId} className="flex items-stretch gap-2">
        {canSubstitute && (
          <button
            type="button"
            onClick={() => setPinchHitTarget(entry)}
            className="w-10 shrink-0 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 text-[10px] font-bold leading-tight flex flex-col items-center justify-center active:opacity-70"
            aria-label={`${entry.battingOrder}棒代打置換`}
          >
            代打
          </button>
        )}
        {mode === 'current' ? (
          <button
            type="button"
            onClick={() => openRecordForPlayer(entry.playerId)}
            disabled={!canRecord}
            className={`flex-1 flex items-center gap-3 rounded-xl px-4 py-3 border-2 text-left border-field-green bg-green-50 ${
              isLastOut ? 'ring-2 ring-red-400' : ''
            } ${!canRecord ? 'opacity-60' : 'active:opacity-90'}`}
          >
            {cardBody}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAsCurrentBatter(entry.playerId)}
            disabled={!canRecord}
            className={`flex-1 flex items-center gap-3 rounded-xl px-4 py-3 border-2 text-left border-gray-200 bg-white ${
              isLastOut ? 'ring-2 ring-red-400' : ''
            } ${mode === 'browse' && selectedPlayer === entry.playerId ? 'border-field-green/50 bg-green-50/50' : ''} ${
              canRecord ? 'active:opacity-90 hover:border-field-green/40' : ''
            }`}
          >
            {cardBody}
          </button>
        )}
      </div>
    );
  };

  const lineupPaginationCount = canRecord ? otherLineupPageCount : browseLineupPageCount;

  const openEditForAtBat = (atBat: AtBat) => {
    if (isReadOnly) return;
    setRecordSheet({ type: 'edit', atBat });
    setEditRbi(atBat.rbi);
    setEditOuts(atBat.outs);
    setShowRbiPicker(false);
    setPendingResult(null);
  };

  const handleSelectHalf = (inning: number, half: HalfInning) => {
    if (!activeGame) return;
    if (!isReadOnly && isHalfComplete(activeGame, inning, half)) return;
    guardedUpdate({ ...activeGame, currentInning: inning, currentHalf: half });
  };

  const handleResultClick = (result: AtBatResult) => {
    if (!activeGame || !selectedPlayer || !canRecord || recordSheet?.type !== 'new') return;
    setPendingResult(result);
    setPendingRbi(0);
    setPendingOuts(getDefaultOutsForResult(result));
    setShowRbiPicker(true);
  };

  const addAtBat = (result: AtBatResult, rbiCount: number, outsCount: number) => {
    if (!activeGame || !selectedPlayer) return;
    const now = new Date().toISOString();
    const inning = activeGame.currentInning;
    const half = activeGame.currentHalf;
    const atBat: AtBat = {
      id: uuid(),
      playerId: selectedPlayer,
      result,
      rbi: rbiCount,
      outs: outsCount,
      inning,
      half,
      updatedAt: now,
    };
    const newAtBats = [...activeGame.atBats, atBat];
    const updatedGame = applyGameAfterAtBatChange(activeGame, newAtBats, inning, half, now);
    guardedUpdate(updatedGame);
    const lineup = activeGame.lineup.filter((l) => l.isActive).sort((a, b) => a.battingOrder - b.battingOrder);
    const idx = lineup.findIndex((l) => l.playerId === selectedPlayer);
    const nextPlayerId = idx >= 0 && lineup.length > 0 ? lineup[(idx + 1) % lineup.length].playerId : selectedPlayer;
    setSelectedPlayer(nextPlayerId);
    closeRecordSheet();
  };

  const undoLast = () => {
    if (!activeGame || activeGame.atBats.length === 0 || isReadOnly) return;
    const now = new Date().toISOString();
    guardedUpdate({ ...activeGame, atBats: activeGame.atBats.slice(0, -1), syncUpdatedAt: now });
  };

  const saveEditAtBat = () => {
    if (!activeGame || recordSheet?.type !== 'edit') return;
    const { atBat } = recordSheet;
    const now = new Date().toISOString();
    const newAtBats = activeGame.atBats.map((a) =>
      a.id === atBat.id ? { ...a, rbi: editRbi, outs: editOuts, updatedAt: now } : a
    );
    const updatedGame = applyGameAfterAtBatChange(
      activeGame,
      newAtBats,
      atBat.inning,
      atBat.half,
      now
    );
    guardedUpdate(updatedGame);
    closeRecordSheet();
  };

  const deleteAtBat = (atBatId: string) => {
    if (!activeGame || isReadOnly) return;
    const now = new Date().toISOString();
    guardedUpdate({
      ...activeGame,
      atBats: activeGame.atBats.filter((a) => a.id !== atBatId),
      syncUpdatedAt: now,
    });
    if (recordSheet?.type === 'edit' && recordSheet.atBat.id === atBatId) {
      closeRecordSheet();
    }
  };

  if (!activeGame) {
    return (
      <div className="p-4">
        <EmptyState
          icon="✏️"
          title="尚未選擇比賽"
          description="請至「比賽」分頁點選比賽進入紀錄"
        />
      </div>
    );
  }

  if (players.length === 0 && activeLineup.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon="👥"
          title={recorderMode ? '等待主控端設定先發' : '尚無球員'}
          description={recorderMode ? '請主控端在「守位」分頁排定先發' : '請先到「球員」頁面新增球員'}
        />
        {!recorderMode && (
          <Button variant="secondary" onClick={() => onSelectGame(null)} className="w-full mt-4">返回</Button>
        )}
      </div>
    );
  }

  const showSync = (activeGame.isShared || activeGame.liveRoomId) && syncState;
  const isLiveSync = syncState && 'connected' in syncState;
  const subTabs: RecordSubTab[] = recorderMode ? ['record', 'positions'] : ['record', 'positions', 'lineup'];

  return (
    <div className="p-3 space-y-3">
      {!recorderMode && (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-bold truncate">{activeGame.opponent}</h2>
            <p className="text-xs text-gray-500">{activeGame.date}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {hasBoxScoreData(activeGame) && (
              <Button
                variant="secondary"
                onClick={() => setShowBoxScore(true)}
                className="!py-2 !px-3 text-sm"
              >
                戰報
              </Button>
            )}
            <Button variant="secondary" onClick={() => onSelectGame(null)} className="!py-2 !px-3 text-sm">換場</Button>
          </div>
        </div>
      )}

      {showBoxScore && activeGame && (
        <GameBoxScoreSheet
          game={activeGame}
          players={players}
          seasons={seasons}
          teamName={teamName}
          publishedBy={publishedBy}
          onClose={() => setShowBoxScore(false)}
          hasBottomNav={hasBottomNav}
        />
      )}

      {isReadOnly && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center">
          比賽已完成 · 僅供查閱
        </div>
      )}

      <Scoreboard
        game={activeGame}
        players={players}
        onUpdate={guardedUpdate}
        onSelectHalf={handleSelectHalf}
        readOnly={isReadOnly}
        ourTeamName={teamName}
        opponentName={activeGame.opponent}
      />

      {showSync && (
        <div className={`text-xs rounded-xl px-3 py-2 flex items-center justify-between ${
          syncState.error ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
        }`}>
          <span>
            {syncState.error
              ? `同步失敗：${syncState.error}`
              : syncState.syncing
                ? '正在與其他裝置同步...'
                : isLiveSync
                  ? (syncState as LiveSyncState).connected
                    ? `即時連線 · ${syncState.lastSync?.toLocaleTimeString('zh-TW') ?? ''}`
                    : '連線中...'
                  : syncState.lastSync
                    ? `共用 · ${(syncState as SharedSyncState).lastAction || '已同步'} · ${syncState.lastSync.toLocaleTimeString('zh-TW')}`
                    : '等待同步'}
          </span>
          {onSyncNow && (
            <button onClick={onSyncNow} className="text-field-green font-medium shrink-0 ml-2">
              立即同步
            </button>
          )}
        </div>
      )}

      <div className="flex gap-1.5 bg-gray-200 rounded-2xl p-1.5 border border-gray-300 shadow-sm">
        {subTabs.map((t) => {
          const isActive = subTab === t;
          const tabClass =
            t === 'positions'
              ? isActive
                ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-300'
                : 'bg-white/70 text-sky-700 hover:bg-white'
              : t === 'lineup'
                ? isActive
                  ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
                  : 'bg-white/70 text-amber-700 hover:bg-white'
                : isActive
                  ? 'bg-field-green text-white shadow-md ring-2 ring-green-300'
                  : 'bg-white/70 text-gray-600 hover:bg-white';
          return (
            <button
              key={t}
              type="button"
              onClick={() => setSubTab(t)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tabClass}`}
            >
              {t === 'record' ? '紀錄' : t === 'lineup' ? '棒次' : '守位'}
            </button>
          );
        })}
      </div>

      {subTab === 'positions' && (
        <PositionPanel
          game={activeGame}
          players={players}
          onUpdate={recorderMode || isReadOnly ? undefined : guardedUpdate}
          readOnly={isReadOnly}
          hasBottomNav={hasBottomNav}
        />
      )}

      {!recorderMode && subTab === 'lineup' && (
        <LineupPanel
          game={activeGame}
          players={players}
          onUpdate={guardedUpdate}
          readOnly={isReadOnly}
          hasBottomNav={hasBottomNav}
        />
      )}

      {subTab === 'record' && (
        <>
          {activeLineup.length > 0 && currentEntry && (
            <div className="rounded-xl border-2 border-field-green bg-green-50/80 p-2 shadow-sm">
              <h4 className="text-xs text-field-green font-semibold mb-2 px-1">
                {canRecord ? '目前棒次 · 點擊紀錄打席' : '目前棒次'}
              </h4>
              {renderLineupRow(currentEntry, 'current')}
            </div>
          )}

          <div className="text-center text-sm bg-gray-50 rounded-xl py-2">
            <span className="font-bold text-field-green">
              {getInningLabel(activeGame.currentInning, activeGame.currentHalf)}
            </span>
            {canRecord && currentStats && (
              <span className="ml-2 text-gray-600">
                得分 {currentStats.runs} · {currentStats.outs} 出局
              </span>
            )}
            {!canRecord && !isReadOnly && (
              <span className="ml-2 text-orange-600">{activeGame.opponent} 進攻 — 請點比分表輸入得分</span>
            )}
            {isReadOnly && (
              <span className="ml-2 text-gray-500">僅供查閱</span>
            )}
          </div>

          {activeLineup.length === 0 ? (
            <Card className="text-center text-sm text-gray-500 py-6">
              請先到「守位」分頁排定先發（或至「棒次」微調打序）
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4">
                {canRecord && currentEntry ? (
                  <>
                    {nextThreeEntries.length > 0 && (
                      <div>
                        <h4 className="text-xs text-gray-500 mb-2 px-1">下 3 棒 · 點擊設為目前棒次</h4>
                        <div className="space-y-2.5">
                          {nextThreeEntries.map((entry) => renderLineupRow(entry, 'upcoming'))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h4 className="text-xs text-gray-500">打序（每頁 3 棒）</h4>
                      {lineupPaginationCount > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setLineupPage(
                                (p) => (p - 1 + lineupPaginationCount) % lineupPaginationCount
                              )
                            }
                            className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm"
                            aria-label="上一頁打序"
                          >
                            ‹
                          </button>
                          <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                            {lineupPage + 1}/{lineupPaginationCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLineupPage((p) => (p + 1) % lineupPaginationCount)}
                            className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm"
                            aria-label="下一頁打序"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {pagedBrowseEntries.map((entry) => renderLineupRow(entry, 'browse'))}
                    </div>
                  </>
                )}

                {canRecord && otherLineupEntries.length > 0 && (
                  <div className={nextThreeEntries.length > 0 ? 'pt-2 border-t border-gray-100' : ''}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h4 className="text-xs text-gray-500">其他棒次 · 點擊設為目前棒次</h4>
                      {otherLineupPageCount > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setLineupPage(
                                (p) => (p - 1 + otherLineupPageCount) % otherLineupPageCount
                              )
                            }
                            className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm"
                            aria-label="上一頁其他棒次"
                          >
                            ‹
                          </button>
                          <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                            {lineupPage + 1}/{otherLineupPageCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLineupPage((p) => (p + 1) % otherLineupPageCount)}
                            className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm"
                            aria-label="下一頁其他棒次"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {pagedOtherEntries.map((entry) => renderLineupRow(entry, 'upcoming'))}
                    </div>
                  </div>
                )}
              </div>

              {/* 紀錄列表 */}
              <div className="space-y-1.5">
                {!isReadOnly && (
                  <p className="text-xs text-gray-400 px-1">點擊紀錄可編輯打點/出局數</p>
                )}
                {[...activeGame.atBats].reverse().map((atBat) => {
                  const player = players.find((p) => p.id === atBat.playerId);
                  const isEditing = recordSheet?.type === 'edit' && recordSheet.atBat.id === atBat.id;
                  return (
                    <div
                      key={atBat.id}
                      className={`text-sm rounded-xl px-3 py-2.5 flex justify-between items-center gap-2 ${
                        isEditing ? 'bg-green-100 ring-2 ring-field-green' : 'bg-gray-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openEditForAtBat(atBat)}
                        disabled={isReadOnly}
                        className={`flex-1 text-left min-h-[44px] flex flex-col justify-center ${
                          isReadOnly ? 'cursor-default' : 'active:opacity-70'
                        }`}
                      >
                        <span className="text-gray-400 text-xs">
                          {getInningLabel(atBat.inning, atBat.half)}
                        </span>
                        <span>
                          {player?.name} {getResultLabel(atBat.result)}
                          {atBat.rbi > 0 ? ` +${atBat.rbi}分` : ''} / 出局{atBat.outs}
                        </span>
                      </button>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => deleteAtBat(atBat.id)}
                          className="text-red-500 font-medium px-3 py-2 rounded-lg bg-red-50 min-h-[44px] shrink-0"
                        >
                          刪
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isReadOnly && (
              <RecordSheetOverlay
                recordSheet={recordSheet}
                activeLineup={activeLineup}
                players={players}
                showRbiPicker={showRbiPicker}
                pendingResult={pendingResult}
                pendingRbi={pendingRbi}
                pendingOuts={pendingOuts}
                editRbi={editRbi}
                editOuts={editOuts}
                hasBottomNav={hasBottomNav}
                onClose={closeRecordSheet}
                onResultClick={handleResultClick}
                onPendingRbi={setPendingRbi}
                onPendingOuts={setPendingOuts}
                onQuickAdd={() =>
                  pendingResult &&
                  addAtBat(pendingResult, 0, getDefaultOutsForResult(pendingResult))
                }
                onConfirmAdd={() => pendingResult && addAtBat(pendingResult, pendingRbi, pendingOuts)}
                onCancelRbi={() => {
                  setShowRbiPicker(false);
                  setPendingResult(null);
                }}
                onEditRbi={setEditRbi}
                onEditOuts={setEditOuts}
                onSaveEdit={saveEditAtBat}
              />
              )}

              {pinchHitTarget && (
                <PlayerPickerSheet
                  title={`${pinchHitTarget.battingOrder}棒代打 — 選擇替補球員`}
                  players={players}
                  disabledIds={activeLineup
                    .map((e) => e.playerId)
                    .filter((id) => id !== pinchHitTarget.playerId)}
                  allowClear={false}
                  hasBottomNav={hasBottomNav}
                  onSelect={handlePinchHitSelect}
                  onClose={() => setPinchHitTarget(null)}
                />
              )}
            </div>
          )}

          {canRecord && (
            <Button
              variant="secondary"
              onClick={undoLast}
              className="w-full !py-3 text-base"
              disabled={activeGame.atBats.length === 0}
            >
              復原上一筆
            </Button>
          )}
          {recordSheet && <div className="h-4" aria-hidden />}
        </>
      )}
    </div>
  );
}

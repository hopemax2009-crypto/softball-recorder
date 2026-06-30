import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { AtBat, AtBatResult, Game, HalfInning, Player, RecordSubTab } from '../types';
import { AT_BAT_RESULTS } from '../types';
import {
  getAtBatsForHalf,
  getHalfInningStats,
  getInningLabel,
  getLastOutPlayerId,
  isOurBattingHalf,
} from '../utils/gameLogic';
import { getResultLabel } from '../utils/stats';
import type { LiveSyncState } from '../hooks/useLiveRoomSync';
import type { SharedSyncState } from '../hooks/useSharedGameSync';
import { LineupPanel } from './LineupPanel';
import { PositionPanel } from './PositionPanel';
import { Scoreboard } from './Scoreboard';
import { Button, Card, EmptyState } from './ui';

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
  title,
}: {
  rbi: number;
  outs: number;
  onRbi: (n: number) => void;
  onOuts: (n: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onQuick?: () => void;
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
          快速：0分0出局
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
      <p className="text-xs text-gray-500 text-center mt-4 mb-2">出局數</p>
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
  games: Game[];
  players: Player[];
  activeGame: Game | null;
  recorderMode?: boolean;
  hasBottomNav?: boolean;
  syncState?: SharedSyncState | LiveSyncState | null;
  onSyncNow?: () => void;
  onSelectGame: (game: Game | null) => void;
  onUpdateGame: (game: Game) => void;
}

export function RecordPanel({
  games,
  players: playersProp,
  activeGame,
  recorderMode = false,
  hasBottomNav = false,
  syncState,
  onSyncNow,
  onSelectGame,
  onUpdateGame,
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

  const recentGames = [...games].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const activeLineup = activeGame
    ? (activeGame.lineup ?? []).filter((l) => l.isActive).sort((a, b) => a.battingOrder - b.battingOrder)
    : [];

  useEffect(() => {
    if (activeLineup.length > 0 && !selectedPlayer) {
      setSelectedPlayer(activeLineup[0].playerId);
    }
  }, [activeGame?.id, activeLineup.length, selectedPlayer]);

  const currentHalfAtBats = activeGame
    ? getAtBatsForHalf(activeGame, activeGame.currentInning, activeGame.currentHalf)
    : [];

  const currentStats = activeGame
    ? getHalfInningStats(activeGame, activeGame.currentInning, activeGame.currentHalf)
    : null;

  const lastOutId = activeGame
    ? getLastOutPlayerId(currentHalfAtBats)
    : null;

  const canRecord = activeGame && isOurBattingHalf(activeGame, activeGame.currentInning, activeGame.currentHalf);

  const closeRecordSheet = () => {
    setRecordSheet(null);
    setShowRbiPicker(false);
    setPendingResult(null);
    setPendingRbi(0);
    setPendingOuts(0);
  };

  const openRecordForPlayer = (playerId: string) => {
    if (!canRecord) return;
    setSelectedPlayer(playerId);
    setRecordSheet({ type: 'new', playerId });
    setShowRbiPicker(false);
    setPendingResult(null);
    setPendingRbi(0);
    setPendingOuts(0);
  };

  const openEditForAtBat = (atBat: AtBat) => {
    setRecordSheet({ type: 'edit', atBat });
    setEditRbi(atBat.rbi);
    setEditOuts(atBat.outs);
    setShowRbiPicker(false);
    setPendingResult(null);
  };

  const handleSelectHalf = (inning: number, half: HalfInning) => {
    if (!activeGame) return;
    onUpdateGame({ ...activeGame, currentInning: inning, currentHalf: half });
  };

  const handleResultClick = (result: AtBatResult) => {
    if (!activeGame || !selectedPlayer || !canRecord || recordSheet?.type !== 'new') return;
    setPendingResult(result);
    setPendingRbi(0);
    setPendingOuts(0);
    setShowRbiPicker(true);
  };

  const addAtBat = (result: AtBatResult, rbiCount: number, outsCount: number) => {
    if (!activeGame || !selectedPlayer) return;
    const now = new Date().toISOString();
    const atBat: AtBat = {
      id: uuid(),
      playerId: selectedPlayer,
      result,
      rbi: rbiCount,
      outs: outsCount,
      inning: activeGame.currentInning,
      half: activeGame.currentHalf,
      updatedAt: now,
    };
    const newAtBats = [...activeGame.atBats, atBat];
    onUpdateGame({ ...activeGame, atBats: newAtBats });

    const lineup = activeGame.lineup.filter((l) => l.isActive).sort((a, b) => a.battingOrder - b.battingOrder);
    const idx = lineup.findIndex((l) => l.playerId === selectedPlayer);
    const nextPlayerId = idx >= 0 && lineup.length > 0 ? lineup[(idx + 1) % lineup.length].playerId : selectedPlayer;
    setSelectedPlayer(nextPlayerId);
    closeRecordSheet();
  };

  const undoLast = () => {
    if (!activeGame || activeGame.atBats.length === 0) return;
    onUpdateGame({ ...activeGame, atBats: activeGame.atBats.slice(0, -1) });
  };

  const saveEditAtBat = () => {
    if (!activeGame || recordSheet?.type !== 'edit') return;
    const { atBat } = recordSheet;
    const now = new Date().toISOString();
    onUpdateGame({
      ...activeGame,
      atBats: activeGame.atBats.map((a) =>
        a.id === atBat.id ? { ...a, rbi: editRbi, outs: editOuts, updatedAt: now } : a
      ),
    });
    closeRecordSheet();
  };

  const deleteAtBat = (atBatId: string) => {
    if (!activeGame) return;
    const now = new Date().toISOString();
    onUpdateGame({
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
        <EmptyState icon="✏️" title="選擇比賽開始紀錄" description="選擇一場比賽進入打擊紀錄" />
        {recentGames.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium text-gray-500 px-1">最近比賽</h3>
            {recentGames.map((game) => (
              <Card key={game.id}>
                <button onClick={() => onSelectGame(game)} className="w-full text-left">
                  <div className="font-semibold">{game.opponent}</div>
                  <div className="text-sm text-gray-500">{game.date} · {game.atBats.length} 打席</div>
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (players.length === 0 && activeLineup.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon="👥"
          title={recorderMode ? '等待主控端設定先發' : '尚無球員'}
          description={recorderMode ? '請主控端在「先發」分頁設定上場球員' : '請先到「球員」頁面新增球員'}
        />
        {!recorderMode && (
          <Button variant="secondary" onClick={() => onSelectGame(null)} className="w-full mt-4">返回</Button>
        )}
      </div>
    );
  }

  const showSync = (activeGame.isShared || activeGame.liveRoomId) && syncState;
  const isLiveSync = syncState && 'connected' in syncState;
  const subTabs: RecordSubTab[] = recorderMode ? ['record', 'positions'] : ['record', 'lineup', 'positions'];

  return (
    <div className="p-3 space-y-3">
      {!recorderMode && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">{activeGame.opponent}</h2>
            <p className="text-xs text-gray-500">{activeGame.date}</p>
          </div>
          <Button variant="secondary" onClick={() => onSelectGame(null)} className="!py-2 !px-3 text-sm">換場</Button>
        </div>
      )}

      <Scoreboard
        game={activeGame}
        onUpdate={onUpdateGame}
        onSelectHalf={handleSelectHalf}
        readOnlyOpponent={recorderMode}
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

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {subTabs.map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${
              subTab === t ? 'bg-white shadow text-field-green' : 'text-gray-500'
            }`}
          >
            {t === 'record' ? '紀錄' : t === 'lineup' ? '先發' : '守位'}
          </button>
        ))}
      </div>

      {!recorderMode && subTab === 'lineup' && (
        <LineupPanel game={activeGame} players={players} onUpdate={onUpdateGame} />
      )}

      {subTab === 'positions' && (
        <PositionPanel game={activeGame} players={players} />
      )}

      {subTab === 'record' && (
        <>
          <div className="text-center text-sm bg-gray-50 rounded-xl py-2">
            <span className="font-bold text-field-green">
              {getInningLabel(activeGame.currentInning, activeGame.currentHalf)}
            </span>
            {canRecord && currentStats && (
              <span className="ml-2 text-gray-600">
                得分 {currentStats.runs} · {currentStats.outs} 出局
              </span>
            )}
            {!canRecord && !recorderMode && (
              <span className="ml-2 text-orange-600">對方進攻 — 請點比分表輸入得分</span>
            )}
            {!canRecord && recorderMode && (
              <span className="ml-2 text-orange-600">對方進攻</span>
            )}
          </div>

          {activeLineup.length === 0 ? (
            <Card className="text-center text-sm text-gray-500 py-6">
              請先到「先發」分頁設定上場球員與棒次
            </Card>
          ) : (
            <div className="space-y-3">
              {/* 打序：點擊球員彈出紀錄面板 */}
              <div>
                <h4 className="text-xs text-gray-500 px-1 mb-2">
                  {canRecord ? '打序（點擊球員紀錄打席）' : '打序'}
                </h4>
                <div className="space-y-2">
                  {activeLineup.map((entry) => {
                    const player = players.find((p) => p.id === entry.playerId);
                    const isNextBatter = canRecord && selectedPlayer === entry.playerId;
                    const isLastOut = lastOutId === entry.playerId;
                    const playerAtBats = currentHalfAtBats.filter((a) => a.playerId === entry.playerId);
                    return (
                      <button
                        key={entry.playerId}
                        type="button"
                        onClick={() => openRecordForPlayer(entry.playerId)}
                        disabled={!canRecord}
                        className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border-2 text-left ${
                          isNextBatter ? 'border-field-green bg-green-50' : 'border-gray-200 bg-white'
                        } ${isLastOut ? 'ring-2 ring-red-400' : ''} ${!canRecord ? 'opacity-60' : ''}`}
                      >
                        <span className="text-xl font-bold text-field-green w-7 shrink-0">{entry.battingOrder}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base truncate">{player?.name}</p>
                          {playerAtBats.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              本局：{playerAtBats.map((a) => getResultLabel(a.result)).join('、')}
                            </p>
                          )}
                        </div>
                        {isNextBatter && (
                          <span className="text-xs bg-field-green text-white px-2.5 py-1 rounded-full shrink-0">
                            打擊
                          </span>
                        )}
                        {isLastOut && (
                          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full shrink-0">出局</span>
                        )}
                        {canRecord && (
                          <span className="text-gray-300 shrink-0">›</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 紀錄列表 */}
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 px-1">點擊紀錄可編輯打點/出局數</p>
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
                        className="flex-1 text-left min-h-[44px] flex flex-col justify-center active:opacity-70"
                      >
                        <span className="text-gray-400 text-xs">
                          {getInningLabel(atBat.inning, atBat.half)}
                        </span>
                        <span>
                          {player?.name} {getResultLabel(atBat.result)}
                          {atBat.rbi > 0 ? ` +${atBat.rbi}分` : ''} / 出局{atBat.outs}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAtBat(atBat.id)}
                        className="text-red-500 font-medium px-3 py-2 rounded-lg bg-red-50 min-h-[44px] shrink-0"
                      >
                        刪
                      </button>
                    </div>
                  );
                })}
              </div>

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
                onQuickAdd={() => pendingResult && addAtBat(pendingResult, 0, 0)}
                onConfirmAdd={() => pendingResult && addAtBat(pendingResult, pendingRbi, pendingOuts)}
                onCancelRbi={() => {
                  setShowRbiPicker(false);
                  setPendingResult(null);
                }}
                onEditRbi={setEditRbi}
                onEditOuts={setEditOuts}
                onSaveEdit={saveEditAtBat}
              />
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

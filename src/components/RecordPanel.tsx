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

interface Props {
  games: Game[];
  players: Player[];
  activeGame: Game | null;
  recorderMode?: boolean;
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
  syncState,
  onSyncNow,
  onSelectGame,
  onUpdateGame,
}: Props) {
  const players = playersProp ?? [];
  const [subTab, setSubTab] = useState<RecordSubTab>('record');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [showRbiPicker, setShowRbiPicker] = useState(false);
  const [pendingResult, setPendingResult] = useState<AtBatResult | null>(null);
  const [pendingRbi, setPendingRbi] = useState(0);
  const [pendingOuts, setPendingOuts] = useState(0);
  const [editingAtBat, setEditingAtBat] = useState<AtBat | null>(null);
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

  const handleSelectHalf = (inning: number, half: HalfInning) => {
    if (!activeGame) return;
    onUpdateGame({ ...activeGame, currentInning: inning, currentHalf: half });
  };

  const handleResultClick = (result: AtBatResult) => {
    if (!activeGame || !selectedPlayer || !canRecord) return;
    setEditingAtBat(null);
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
    setShowRbiPicker(false);
    setPendingResult(null);
    setPendingRbi(0);
    setPendingOuts(0);

    const lineup = activeGame.lineup.filter((l) => l.isActive).sort((a, b) => a.battingOrder - b.battingOrder);
    const idx = lineup.findIndex((l) => l.playerId === selectedPlayer);
    if (idx >= 0 && lineup.length > 0) {
      setSelectedPlayer(lineup[(idx + 1) % lineup.length].playerId);
    }
  };

  const undoLast = () => {
    if (!activeGame || activeGame.atBats.length === 0) return;
    onUpdateGame({ ...activeGame, atBats: activeGame.atBats.slice(0, -1) });
  };

  const startEditAtBat = (atBat: AtBat) => {
    setEditingAtBat(atBat);
    setEditRbi(atBat.rbi);
    setEditOuts(atBat.outs);
    setShowRbiPicker(false);
    setPendingResult(null);
  };

  const saveEditAtBat = () => {
    if (!activeGame || !editingAtBat) return;
    const now = new Date().toISOString();
    onUpdateGame({
      ...activeGame,
      atBats: activeGame.atBats.map((a) =>
        a.id === editingAtBat.id ? { ...a, rbi: editRbi, outs: editOuts, updatedAt: now } : a
      ),
    });
    setEditingAtBat(null);
  };

  const deleteAtBat = (atBatId: string) => {
    if (!activeGame) return;
    onUpdateGame({
      ...activeGame,
      atBats: activeGame.atBats.filter((a) => a.id !== atBatId),
    });
    if (editingAtBat?.id === atBatId) setEditingAtBat(null);
  };

  const ScorePicker = ({
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
  }) => (
    <div className="mt-2 p-2 bg-green-50 rounded-xl">
      <p className="text-xs text-center mb-1">{title}</p>
      {onQuick && (
        <button
          onClick={onQuick}
          className="w-full mb-2 py-2 rounded-lg bg-white border-2 border-field-green text-field-green text-xs font-bold"
        >
          快速：0分0出局
        </button>
      )}
      <p className="text-[10px] text-gray-500 text-center mb-1">打點</p>
      <div className="grid grid-cols-5 gap-1">
        {[0, 1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => onRbi(n)}
            className={`rounded-lg py-1 text-sm font-bold ${
              rbi === n ? 'bg-field-green text-white' : 'bg-white text-field-green border border-field-green'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-500 text-center mt-2 mb-1">出局數</p>
      <div className="grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => onOuts(n)}
            className={`rounded-lg py-1 text-sm font-bold ${
              outs === n ? 'bg-red-500 text-white' : 'bg-white text-red-500 border border-red-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex gap-1 mt-2">
        <button onClick={onConfirm} className="flex-1 bg-field-green text-white rounded-lg py-1.5 text-sm font-bold">
          確認
        </button>
        <button onClick={onCancel} className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-1.5 text-sm font-bold">
          取消
        </button>
      </div>
    </div>
  );

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
            <div className="grid grid-cols-2 gap-2">
              {/* 左：球員名單 */}
              <div className="space-y-1">
                <h4 className="text-xs text-gray-500 px-1">打序</h4>
                {activeLineup.map((entry) => {
                  const player = players.find((p) => p.id === entry.playerId);
                  const isSelected = selectedPlayer === entry.playerId;
                  const isLastOut = lastOutId === entry.playerId;
                  const playerAtBats = currentHalfAtBats.filter((a) => a.playerId === entry.playerId);
                  return (
                    <button
                      key={entry.playerId}
                      onClick={() => canRecord && setSelectedPlayer(entry.playerId)}
                      disabled={!canRecord}
                      className={`w-full text-left rounded-xl px-2 py-2 text-sm border-2 transition ${
                        isSelected ? 'border-field-green bg-green-50' : 'border-transparent bg-white'
                      } ${isLastOut ? 'ring-2 ring-red-400' : ''} ${!canRecord ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">
                          <span className="text-field-green mr-1">{entry.battingOrder}</span>
                          {player?.name}
                        </span>
                        {isLastOut && (
                          <span className="text-[10px] bg-red-500 text-white px-1.5 rounded-full shrink-0">出局</span>
                        )}
                      </div>
                      {playerAtBats.length > 0 && (
                        <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                          {playerAtBats.map((a) => getResultLabel(a.result)).join('、')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 右：打席結果 */}
              <div>
                <h4 className="text-xs text-gray-500 px-1 mb-1">打席結果</h4>
                {!canRecord ? (
                  <p className="text-xs text-gray-400 text-center py-8">我方未進攻</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-1">
                      {AT_BAT_RESULTS.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => handleResultClick(r.value)}
                          className={`rounded-xl py-2 text-xs font-bold ${RESULT_COLORS[r.value]}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                    {showRbiPicker && pendingResult && (
                      <ScorePicker
                        title={`${getResultLabel(pendingResult)}：請選擇打點與出局數`}
                        rbi={pendingRbi}
                        outs={pendingOuts}
                        onRbi={setPendingRbi}
                        onOuts={setPendingOuts}
                        onQuick={() => addAtBat(pendingResult, 0, 0)}
                        onConfirm={() => addAtBat(pendingResult, pendingRbi, pendingOuts)}
                        onCancel={() => {
                          setShowRbiPicker(false);
                          setPendingResult(null);
                        }}
                      />
                    )}
                    {editingAtBat && (
                      <ScorePicker
                        title={`編輯：${getResultLabel(editingAtBat.result)}`}
                        rbi={editRbi}
                        outs={editOuts}
                        onRbi={setEditRbi}
                        onOuts={setEditOuts}
                        onConfirm={saveEditAtBat}
                        onCancel={() => setEditingAtBat(null)}
                      />
                    )}
                  </>
                )}

                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  <p className="text-[10px] text-gray-400 px-1">點擊紀錄可編輯打點/出局數</p>
                  {[...activeGame.atBats].reverse().map((atBat) => {
                    const player = players.find((p) => p.id === atBat.playerId);
                    const isEditing = editingAtBat?.id === atBat.id;
                    return (
                      <div
                        key={atBat.id}
                        className={`text-[10px] rounded-lg px-2 py-1 flex justify-between items-center ${
                          isEditing ? 'bg-green-100 ring-1 ring-field-green' : 'bg-gray-50'
                        }`}
                      >
                        <button onClick={() => startEditAtBat(atBat)} className="flex-1 text-left">
                          <span className="text-gray-400 mr-1">
                            {getInningLabel(atBat.inning, atBat.half)}
                          </span>
                          {player?.name} {getResultLabel(atBat.result)}
                          {atBat.rbi > 0 ? ` +${atBat.rbi}分` : ''} / 出局{atBat.outs}
                        </button>
                        <button
                          onClick={() => deleteAtBat(atBat.id)}
                          className="text-red-400 px-1 shrink-0"
                        >
                          刪
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {canRecord && (
            <Button variant="secondary" onClick={undoLast} className="w-full !py-2 text-sm" disabled={activeGame.atBats.length === 0}>
              復原上一筆
            </Button>
          )}
        </>
      )}
    </div>
  );
}

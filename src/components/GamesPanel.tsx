import { useEffect, useState } from 'react';
import type { Game, Season } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { createLiveRoom, closeLiveRoom, fetchLiveRoom, generatePin } from '../services/liveRoomSync';
import { saveHostRoom, loadHostRoom, clearHostRoom } from '../utils/hostRoomStorage';
import { hasActiveLineup } from '../utils/gameLogic';
import { QRShareModal } from './QRShareModal';
import { Button, Card, EmptyState, Input, Select } from './ui';

interface Props {
  seasons: Season[];
  games: Game[];
  players: import('../types').Player[];
  ownerName: string;
  onAddSeason: (name: string, year: number) => import('../types').Season | undefined;
  onAddGame: (seasonId: string, date: string, opponent: string, location?: string, isHomeTeam?: boolean) => Game | undefined;
  onSelectGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
  onUpsertGame: (game: Game) => void;
}

export function GamesPanel({
  seasons,
  games,
  players,
  ownerName,
  onAddSeason,
  onAddGame,
  onSelectGame,
  onDeleteGame,
  onUpsertGame,
}: Props) {
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const [seasonName, setSeasonName] = useState('');
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]?.id ?? '');

  useEffect(() => {
    if (seasons.length === 0) return;
    setSelectedSeason((prev) => {
      if (prev && seasons.some((s) => s.id === prev)) return prev;
      return seasons[0].id;
    });
  }, [seasons]);
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isHomeTeam, setIsHomeTeam] = useState(true);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [qrModal, setQrModal] = useState<{
    roomId: string;
    pin: string;
    opponent: string;
    game: Game;
  } | null>(null);

  const filteredGames = games
    .filter((g) => !selectedSeason || g.seasonId === selectedSeason)
    .sort((a, b) => b.date.localeCompare(a.date));

  const openQrModal = (roomId: string, pin: string, opponentName: string, game: Game) => {
    const gameWithRoom: Game = {
      ...game,
      liveRoomId: roomId,
      liveRoomPin: pin,
      isShared: true,
    };
    saveHostRoom({ gameId: game.id, roomId, pin });
    setQrModal({ roomId, pin, opponent: opponentName, game: gameWithRoom });
  };

  const handleStartHost = () => {
    if (!qrModal) return;
    onUpsertGame(qrModal.game);
    onSelectGame(qrModal.game);
    setQrModal(null);
  };

  const handleAddSeason = () => {
    if (!seasonName.trim()) return;
    const season = onAddSeason(seasonName.trim(), seasonYear);
    if (season) setSelectedSeason(season.id);
    setSeasonName('');
    setShowAddSeason(false);
  };

  const handleAddGame = () => {
    if (!selectedSeason) {
      setStatus('請先選擇賽季');
      return;
    }
    if (!opponent.trim()) return;
    onAddGame(selectedSeason, date, opponent.trim(), location.trim() || undefined, isHomeTeam);
    setOpponent('');
    setLocation('');
    setShowAddGame(false);
    setStatus('');
  };

  const handleStartLive = async (game: Game) => {
    if (game.isCompleted) {
      setStatus('此比賽已標記完成，無法再開啟 QR 共用');
      return;
    }
    if (!isFirebaseConfigured()) {
      setStatus('雲端尚未設定，請管理者在 .env 設定 Firebase（一次性）');
      return;
    }
    if (!hasActiveLineup(game)) {
      setStatus('請先到紀錄頁「先發」設定上場球員');
      onSelectGame(game);
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const pin = generatePin();
      const room = await createLiveRoom(game, players, ownerName, pin);
      onUpsertGame(room.game);
      openQrModal(room.roomId, room.pin, game.opponent, room.game);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '開啟失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleShowQr = async (game: Game) => {
    if (!game.liveRoomId) return;
    if (!isFirebaseConfigured()) {
      setStatus('雲端尚未設定，無法顯示 QR');
      return;
    }

    const cachedPin = game.liveRoomPin ?? loadHostRoom(game.id)?.pin;
    if (cachedPin) {
      openQrModal(game.liveRoomId, cachedPin, game.opponent, game);
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      const room = await fetchLiveRoom(game.liveRoomId);
      if (!room) {
        setStatus('找不到共用場次，請重新開啟 QR 共用');
        return;
      }
      openQrModal(room.roomId, room.pin, game.opponent, { ...game, liveRoomPin: room.pin });
      if (!game.liveRoomPin) {
        onUpsertGame({ ...game, liveRoomPin: room.pin });
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '無法載入 QR');
    } finally {
      setBusy(false);
    }
  };

  const handleQrAction = (game: Game) => {
    if (game.isCompleted && !game.liveRoomId) {
      setStatus('此比賽已結束');
      return;
    }
    if (game.liveRoomId) {
      void handleShowQr(game);
    } else {
      void handleStartLive(game);
    }
  };

  const handleCloseLiveRoom = async (game: Game) => {
    if (!game.liveRoomId) return;
    if (!confirm('關閉 QR 共用後，紀錄員將無法再加入此場次。確定關閉？')) return;
    setBusy(true);
    setStatus('');
    try {
      if (isFirebaseConfigured()) {
        await closeLiveRoom(game.liveRoomId);
      }
      clearHostRoom(game.id);
      const now = new Date().toISOString();
      onUpsertGame({
        ...game,
        liveRoomId: undefined,
        liveRoomPin: undefined,
        isShared: false,
        syncUpdatedAt: now,
      });
      setStatus('已關閉 QR 共用');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '關閉失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkComplete = async (game: Game) => {
    if (game.isCompleted) {
      if (!confirm('取消此比賽的「已完成」標記？')) return;
      onUpsertGame({ ...game, isCompleted: false, syncUpdatedAt: new Date().toISOString() });
      setStatus('已取消完成標記');
      return;
    }
    if (!confirm(`確定將 vs ${game.opponent} 標記為已完成？`)) return;

    let updated: Game = { ...game, isCompleted: true, syncUpdatedAt: new Date().toISOString() };

    if (game.liveRoomId && confirm('是否同時關閉 QR 共用？')) {
      setBusy(true);
      try {
        if (isFirebaseConfigured()) {
          await closeLiveRoom(game.liveRoomId);
        }
        clearHostRoom(game.id);
        updated = {
          ...updated,
          liveRoomId: undefined,
          liveRoomPin: undefined,
          isShared: false,
        };
        setStatus('已標記完成並關閉 QR 共用');
      } catch (e) {
        setStatus(e instanceof Error ? e.message : '關閉 QR 失敗');
        return;
      } finally {
        setBusy(false);
      }
    } else {
      setStatus('已標記比賽完成');
    }
    onUpsertGame(updated);
  };

  const handleSelectGameClick = (game: Game) => {
    onSelectGame(game);
    if (!hasActiveLineup(game)) {
      setStatus('請先設定先發名單與棒次');
    } else {
      setStatus('');
    }
  };

  if (seasons.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon="🏟️" title="尚無賽季" description="請先建立賽季，才能新增比賽" />
        {showAddSeason ? (
          <Card className="mt-4 space-y-3">
            <Input label="賽季名稱" placeholder="例：2025 春季聯賽" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} />
            <Input label="年份" type="number" value={seasonYear} onChange={(e) => setSeasonYear(Number(e.target.value))} />
            <div className="flex gap-2">
              <Button onClick={handleAddSeason} className="flex-1">建立</Button>
              <Button variant="secondary" onClick={() => setShowAddSeason(false)} className="flex-1">取消</Button>
            </div>
          </Card>
        ) : (
          <Button onClick={() => setShowAddSeason(true)} className="w-full mt-4">新增賽季</Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {qrModal && (
        <QRShareModal
          roomId={qrModal.roomId}
          pin={qrModal.pin}
          opponent={qrModal.opponent}
          onClose={handleStartHost}
        />
      )}

      <Card className="bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-sm text-blue-800">主控端開場流程</h3>
        <ol className="text-xs text-blue-700 mt-2 space-y-1 list-decimal list-inside">
          <li>新增比賽 → 設定先發名單</li>
          <li>按「開啟 QR 共用」顯示 QR Code</li>
          <li>其他紀錄員掃描即可加入（無需設定）</li>
        </ol>
      </Card>

      <Select
        label="選擇賽季"
        value={selectedSeason}
        onChange={(e) => setSelectedSeason(e.target.value)}
        options={seasons.map((s) => ({ value: s.id, label: `${s.year} ${s.name}` }))}
      />

      <div className="flex gap-2">
        <Button onClick={() => setShowAddGame(true)} className="flex-1">新增比賽</Button>
        <Button variant="secondary" onClick={() => setShowAddSeason(true)} className="flex-1">新增賽季</Button>
      </div>

      {showAddSeason && (
        <Card className="space-y-3">
          <Input label="賽季名稱" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} />
          <Input label="年份" type="number" value={seasonYear} onChange={(e) => setSeasonYear(Number(e.target.value))} />
          <div className="flex gap-2">
            <Button onClick={handleAddSeason} className="flex-1">建立</Button>
            <Button variant="secondary" onClick={() => setShowAddSeason(false)} className="flex-1">取消</Button>
          </div>
        </Card>
      )}

      {showAddGame && (
        <Card className="space-y-3">
          <Input label="比賽日期" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="對手" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
          <Input label="地點（選填）" value={location} onChange={(e) => setLocation(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsHomeTeam(false)} className={`flex-1 py-2 rounded-xl text-sm ${!isHomeTeam ? 'bg-field-green text-white' : 'bg-gray-100'}`}>先攻</button>
            <button type="button" onClick={() => setIsHomeTeam(true)} className={`flex-1 py-2 rounded-xl text-sm ${isHomeTeam ? 'bg-field-green text-white' : 'bg-gray-100'}`}>後攻</button>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddGame} className="flex-1">建立</Button>
            <Button variant="secondary" onClick={() => setShowAddGame(false)} className="flex-1">取消</Button>
          </div>
        </Card>
      )}

      {status && (
        <p className={`text-sm text-center rounded-xl py-2 px-3 ${
          status.includes('失敗') || status.includes('尚未') || status.includes('找不到') || status.includes('無法')
            ? 'bg-red-50 text-red-600'
            : 'bg-green-50 text-field-green'
        }`}>{status}</p>
      )}

      {filteredGames.length === 0 ? (
        <EmptyState icon="📋" title="尚無比賽" description="點擊上方按鈕新增比賽" />
      ) : (
        <div className="space-y-3">
          {filteredGames.map((game) => {
            const season = seasons.find((s) => s.id === game.seasonId);
            const hasLive = !!game.liveRoomId;
            const completed = !!game.isCompleted;
            return (
              <Card key={game.id}>
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => handleSelectGameClick(game)} className="flex-1 text-left min-h-[48px]">
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      {game.opponent}
                      {completed && (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">已完成</span>
                      )}
                      {hasLive && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">即時共用中</span>
                      )}
                      {!hasActiveLineup(game) && !completed && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">未排先發</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{game.date} · {season?.name} · {game.atBats.length} 打席</div>
                  </button>
                  {!completed && (
                    <button
                      type="button"
                      onClick={() => handleQrAction(game)}
                      disabled={busy}
                      className={`shrink-0 text-sm font-medium px-3 py-3 rounded-xl min-w-[96px] min-h-[48px] ${
                        hasLive
                          ? 'border-2 border-field-green text-field-green bg-white'
                          : 'bg-field-green text-white'
                      } ${busy ? 'opacity-60' : ''}`}
                    >
                      {busy ? '載入中…' : hasLive ? '顯示 QR' : '開啟 QR 共用'}
                    </button>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1">
                  {hasLive && (
                    <button
                      type="button"
                      onClick={() => void handleCloseLiveRoom(game)}
                      disabled={busy}
                      className="text-xs text-orange-600 py-1 px-1 font-medium"
                    >
                      關閉 QR 共用
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleMarkComplete(game)}
                    disabled={busy}
                    className="text-xs text-gray-600 py-1 px-1"
                  >
                    {completed ? '取消完成標記' : '標記比賽完成'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`確定刪除 vs ${game.opponent} 這場比賽？`)) onDeleteGame(game.id);
                    }}
                    className="text-xs text-red-400 py-1 px-1"
                  >
                    刪除比賽
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

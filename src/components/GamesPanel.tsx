import { useState } from 'react';
import type { Game, Season } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { createLiveRoom, generatePin } from '../services/liveRoomSync';
import { saveHostRoom, loadHostRoom } from '../utils/hostRoomStorage';
import { QRShareModal } from './QRShareModal';
import { Button, Card, EmptyState, Input, Select } from './ui';

interface Props {
  seasons: Season[];
  games: Game[];
  players: import('../types').Player[];
  ownerName: string;
  onAddSeason: (name: string, year: number) => void;
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
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isHomeTeam, setIsHomeTeam] = useState(true);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [qrModal, setQrModal] = useState<{ roomId: string; pin: string; opponent: string } | null>(null);

  const filteredGames = games
    .filter((g) => !selectedSeason || g.seasonId === selectedSeason)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAddSeason = () => {
    if (!seasonName.trim()) return;
    onAddSeason(seasonName.trim(), seasonYear);
    setSeasonName('');
    setShowAddSeason(false);
  };

  const handleAddGame = () => {
    if (!selectedSeason || !opponent.trim()) return;
    onAddGame(selectedSeason, date, opponent.trim(), location.trim() || undefined, isHomeTeam);
    setOpponent('');
    setLocation('');
    setShowAddGame(false);
  };

  const handleStartLive = async (game: Game) => {
    if (!isFirebaseConfigured()) {
      setStatus('雲端尚未設定，請管理者在 .env 設定 Firebase（一次性）');
      return;
    }
    if (game.lineup.filter((l) => l.isActive).length === 0) {
      setStatus('請先到紀錄頁「先發」設定上場球員，再開啟即時共用');
      onSelectGame(game);
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const pin = generatePin();
      const room = await createLiveRoom(game, players, ownerName, pin);
      saveHostRoom({ gameId: game.id, roomId: room.roomId, pin: room.pin });
      onUpsertGame(room.game);
      setQrModal({ roomId: room.roomId, pin: room.pin, opponent: game.opponent });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '開啟失敗');
    } finally {
      setBusy(false);
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
          onClose={() => {
            setQrModal(null);
            const g = games.find((x) => x.opponent === qrModal.opponent && x.liveRoomId === qrModal.roomId);
            if (g) onSelectGame(g);
          }}
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
          status.includes('失敗') || status.includes('尚未') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-field-green'
        }`}>{status}</p>
      )}

      {filteredGames.length === 0 ? (
        <EmptyState icon="📋" title="尚無比賽" description="點擊上方按鈕新增比賽" />
      ) : (
        <div className="space-y-3">
          {filteredGames.map((game) => {
            const season = seasons.find((s) => s.id === game.seasonId);
            return (
              <Card key={game.id}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => onSelectGame(game)} className="flex-1 text-left">
                    <div className="font-semibold flex items-center gap-2">
                      {game.opponent}
                      {game.liveRoomId && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">即時共用中</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{game.date} · {season?.name} · {game.atBats.length} 打席</div>
                  </button>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!game.liveRoomId ? (
                      <button
                        onClick={() => handleStartLive(game)}
                        disabled={busy}
                        className="text-xs bg-field-green text-white px-2 py-1.5 rounded-lg font-medium"
                      >
                        開啟 QR 共用
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const info = loadHostRoom(game.id);
                          if (info) setQrModal({ roomId: info.roomId, pin: info.pin, opponent: game.opponent });
                        }}
                        className="text-xs border border-field-green text-field-green px-2 py-1.5 rounded-lg"
                      >
                        顯示 QR
                      </button>
                    )}
                    <button onClick={() => { if (confirm('確定刪除？')) onDeleteGame(game.id); }} className="text-red-400 text-sm px-2">刪除</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
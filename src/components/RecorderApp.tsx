import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game, Player } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { joinLiveRoom } from '../services/liveRoomSync';
import { getRecorderParams } from '../utils/liveRoom';
import { useLiveRoomSync } from '../hooks/useLiveRoomSync';
import { RecordPanel } from './RecordPanel';
import { Button, Card, EmptyState, Input } from './ui';

export function RecorderApp() {
  const params = getRecorderParams();
  const [roomId, setRoomId] = useState(params?.roomId ?? '');
  const [pin, setPin] = useState(params?.pin ?? '');
  const [recorderName, setRecorderName] = useState('');
  const [joined, setJoined] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGameUpdate = useCallback((g: Game, p: Player[]) => {
    setGame(g);
    setPlayers(p);
  }, []);

  const { syncState, pushNow } = useLiveRoomSync(
    joined ? roomId : undefined,
    joined ? pin : undefined,
    game,
    players,
    handleGameUpdate,
    joined
  );

  const handleJoin = async () => {
    if (!roomId.trim() || !pin.trim()) {
      setError('請輸入場次代碼與 PIN');
      return;
    }
    if (!isFirebaseConfigured()) {
      setError('雲端同步尚未設定，請聯繫主控端');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await joinLiveRoom(roomId.trim(), pin.trim());
      setGame(room.game);
      setPlayers(room.players);
      setJoined(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGame = useCallback((updated: Game) => {
    setGame(updated);
  }, []);

  useEffect(() => {
    if (params?.roomId && params?.pin && isFirebaseConfigured()) {
      setRoomId(params.roomId);
      setPin(params.pin);
    }
  }, [params?.roomId, params?.pin]);

  const autoJoinRef = useRef(false);

  useEffect(() => {
    if (!params?.roomId || !params?.pin || joined || autoJoinRef.current) return;
    if (!isFirebaseConfigured()) return;
    autoJoinRef.current = true;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const room = await joinLiveRoom(params.roomId, params.pin);
        setGame(room.game);
        setPlayers(room.players);
        setJoined(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.roomId, params?.pin, joined]);

  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <EmptyState icon="☁️" title="尚未設定雲端" description="請聯繫主控端管理者完成一次性設定" />
        </Card>
      </div>
    );
  }

  if (!joined) {
    const fromQr = !!(params?.roomId && params?.pin);
    return (
      <div className="min-h-screen bg-gradient-to-b from-field-green to-field-light p-4 flex items-center justify-center">
        <Card className="w-full max-w-md space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">📱</div>
            <h1 className="text-xl font-bold text-field-green">紀錄員模式</h1>
            <p className="text-sm text-gray-500 mt-1">
              {fromQr && loading ? '正在加入比賽...' : '掃描主控端 QR Code 或輸入代碼加入'}
            </p>
          </div>
          {!fromQr && (
            <>
              <Input
                label="您的名稱（選填）"
                placeholder="例：小王"
                value={recorderName}
                onChange={(e) => setRecorderName(e.target.value)}
              />
              <Input
                label="場次代碼"
                placeholder="8 碼"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toLowerCase())}
              />
              <Input
                label="PIN 碼"
                placeholder="6 碼數字"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </>
          )}
          {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2">{error}</p>}
          {!fromQr && (
            <Button onClick={handleJoin} disabled={loading} className="w-full">
              {loading ? '加入中...' : '加入比賽紀錄'}
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-4">
      <header className="sticky top-0 z-40 bg-field-green text-white px-4 py-3 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">📱 紀錄員</h1>
            <p className="text-xs text-green-200">
              {recorderName || '紀錄模式'} · vs {game?.opponent}
            </p>
          </div>
          <div className="text-[10px] text-green-200 text-right">
            {syncState.syncing ? '同步中' : syncState.connected ? '已連線' : '連線中'}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {game && (
          <RecordPanel
            games={[game]}
            players={players}
            activeGame={game}
            recorderMode
            syncState={syncState}
            onSyncNow={pushNow}
            onSelectGame={() => {}}
            onUpdateGame={handleUpdateGame}
          />
        )}
      </main>
    </div>
  );
}

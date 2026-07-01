import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game, Player } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { joinLiveRoom } from '../services/liveRoomSync';
import { isGameRecordDataEqual, isSameGameView } from '../utils/gameEquals';
import { getRecorderParams } from '../utils/liveRoom';
import { useLiveRoomSync } from '../hooks/useLiveRoomSync';
import { RecordPanel } from './RecordPanel';
import { PageHelpButton } from './PageHelpButton';
import { Button, Card, EmptyState, Input } from './ui';

const JOIN_TIMEOUT_MS = 15000;

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
  const autoJoinRef = useRef(false);
  const gameRef = useRef<Game | null>(null);
  gameRef.current = game;

  const getLocalGame = useCallback(() => gameRef.current, []);

  const handleGameUpdate = useCallback((g: Game, p: Player[]) => {
    if (isSameGameView(gameRef.current, g)) return;
    gameRef.current = g;
    setGame(g);
    setPlayers(p ?? []);
  }, []);

  const { syncState, pushNow, schedulePush } = useLiveRoomSync(
    joined ? roomId : undefined,
    joined ? pin : undefined,
    game,
    players,
    handleGameUpdate,
    joined,
    getLocalGame
  );

  const attemptJoin = useCallback(async (id: string, code: string) => {
    if (!isFirebaseConfigured()) {
      setError('雲端同步尚未設定，請聯繫主控端');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await Promise.race([
        joinLiveRoom(id.trim(), code.trim()),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('連線逾時，請確認網路或 Firebase 設定')), JOIN_TIMEOUT_MS)
        ),
      ]);
      setGame(room.game);
      setPlayers(room.players ?? []);
      setJoined(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleJoin = async () => {
    if (!roomId.trim() || !pin.trim()) {
      setError('請輸入場次代碼與 PIN');
      return;
    }
    await attemptJoin(roomId, pin);
  };

  const handleUpdateGame = useCallback(
    (updated: Game) => {
      const prev = gameRef.current;
      if (updated.isCompleted && prev?.isCompleted && prev.id === updated.id) {
        if (!isGameRecordDataEqual(prev, updated)) return;
      }
      gameRef.current = updated;
      setGame(updated);
      if (!updated.isCompleted) {
        schedulePush(updated);
      }
    },
    [schedulePush]
  );

  useEffect(() => {
    if (params?.roomId && params?.pin) {
      setRoomId(params.roomId);
      setPin(params.pin);
    }
  }, [params?.roomId, params?.pin]);

  useEffect(() => {
    if (!params?.roomId || !params?.pin || joined || autoJoinRef.current) return;
    if (!isFirebaseConfigured()) return;
    autoJoinRef.current = true;
    void attemptJoin(params.roomId, params.pin);
  }, [params?.roomId, params?.pin, joined, attemptJoin]);

  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="max-w-md text-center">
          <EmptyState
            icon="☁️"
            title="尚未設定雲端"
            description="主控端管理者需在 Firebase 完成一次性設定，並重新部署網站"
          />
        </Card>
      </div>
    );
  }

  if (!joined) {
    const fromQr = !!(params?.roomId && params?.pin);
    return (
      <div className="min-h-screen bg-gradient-to-b from-field-green to-field-light p-4 flex items-center justify-center">
        <Card className="w-full max-w-md space-y-4 relative">
          <div className="absolute top-3 right-3">
            <PageHelpButton pageId="recorder" className="!bg-field-green/20 !text-field-green hover:!bg-field-green/30" />
          </div>
          <div className="text-center">
            <div className="text-5xl mb-2">📱</div>
            <h1 className="text-xl font-bold text-field-green">紀錄員模式</h1>
            {fromQr && loading ? (
              <div className="mt-4">
                <div className="inline-block w-8 h-8 border-4 border-field-green border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600 mt-3">正在加入比賽...</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">掃描主控端 QR Code 或輸入代碼加入</p>
            )}
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
          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 rounded-xl py-3 px-3 space-y-2">
              <p>{error}</p>
              {fromQr && (
                <Button onClick={() => { autoJoinRef.current = true; void attemptJoin(params!.roomId, params!.pin); }} className="w-full !py-2 text-sm">
                  重試
                </Button>
              )}
            </div>
          )}
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
              {recorderName || '紀錄模式'} · vs {game?.opponent ?? '比賽中'}
            </p>
          </div>
          <div className="text-[10px] text-green-200 text-right flex items-center gap-2">
            <div>
              {syncState.syncing ? '同步中' : syncState.connected ? '已連線' : '連線中'}
            </div>
            <PageHelpButton pageId="recorder" />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {game ? (
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
        ) : (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block w-8 h-8 border-4 border-field-green border-t-transparent rounded-full animate-spin mb-3" />
            <p>載入比賽資料...</p>
          </div>
        )}
      </main>
    </div>
  );
}

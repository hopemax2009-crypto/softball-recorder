import type { Game, LineupEntry, Player, Position } from '../types';
import { BATTING_ORDERS, MAX_BATTING_ORDER, POSITIONS } from '../types';
import { touchLineup } from '../utils/gameLogic';
import { Card } from './ui';
interface Props {
  game: Game;
  players: Player[];
  onUpdate: (game: Game) => void;
  readOnly?: boolean;
}

export function LineupPanel({ game, players, onUpdate, readOnly = false }: Props) {
  const activeLineup = game.lineup
    .filter((l) => l.isActive)
    .sort((a, b) => a.battingOrder - b.battingOrder);

  const togglePlayer = (playerId: string) => {
    if (readOnly) return;
    const existing = game.lineup.find((l) => l.playerId === playerId);
    if (existing) {
      onUpdate(touchLineup(game, game.lineup.map((l) =>
          l.playerId === playerId ? { ...l, isActive: !l.isActive } : l
        )));
    } else {
      const usedOrders = game.lineup.filter((l) => l.isActive).map((l) => l.battingOrder);
      let nextOrder = 1;
      while (usedOrders.includes(nextOrder) && nextOrder < MAX_BATTING_ORDER) nextOrder++;
      const entry: LineupEntry = {
        playerId,
        battingOrder: nextOrder,
        position: 'BN',
        isActive: true,
      };
      onUpdate(touchLineup(game, [...game.lineup, entry]));
    }
  };

  const updateEntry = (playerId: string, patch: Partial<LineupEntry>) => {
    if (readOnly) return;
    onUpdate(touchLineup(game, game.lineup.map((l) =>
        l.playerId === playerId ? { ...l, ...patch } : l
      )));
  };

  return (
    <div className="space-y-3">
      {readOnly ? (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">比賽已完成，先發設定僅供查閱</p>
      ) : (
        <p className="text-sm text-gray-500 px-1">點選球員加入先發，設定棒次與守位</p>
      )}
      <div className="space-y-2">
        {players.map((player) => {
          const entry = game.lineup.find((l) => l.playerId === player.id);
          const isActive = entry?.isActive ?? false;
          return (
            <Card key={player.id} className={`!p-3 ${isActive ? 'border-field-green border-2' : ''}`}>
              <button
                onClick={() => togglePlayer(player.id)}
                disabled={readOnly}
                className={`w-full text-left flex items-center justify-between mb-2 ${readOnly ? 'cursor-default' : ''}`}
              >
                <span className="font-semibold">
                  {player.number && <span className="text-field-green mr-1">#{player.number}</span>}
                  {player.name}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${isActive ? 'bg-field-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {isActive ? '先發' : '未上場'}
                </span>
              </button>
              {isActive && entry && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">棒次</label>
                    <select
                      className="input !py-2 text-sm"
                      value={entry.battingOrder}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateEntry(player.id, { battingOrder: Number(e.target.value) })
                      }
                    >
                      {BATTING_ORDERS.map((n) => (
                        <option key={n} value={n}>{n} 棒</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">守位</label>
                    <select
                      className="input !py-2 text-sm"
                      value={entry.position}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateEntry(player.id, { position: e.target.value as Position })
                      }
                    >
                      {POSITIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {activeLineup.length > 0 && (
        <Card className="bg-green-50">
          <h4 className="text-sm font-medium text-field-green mb-2">先發打序</h4>
          <ol className="space-y-1">
            {activeLineup.map((entry) => {
              const player = players.find((pl) => pl.id === entry.playerId);
              const pos = POSITIONS.find((pos) => pos.value === entry.position);
              return (
                <li key={entry.playerId} className="text-sm flex justify-between">
                  <span>{entry.battingOrder}. {player?.name ?? '?'}</span>
                  <span className="text-gray-500">{pos?.label}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
      {players.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">請先到球員頁面新增球員</p>
      )}
    </div>
  );
}

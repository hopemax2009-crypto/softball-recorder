import type { Game, Player, Position } from '../types';
import { POSITIONS } from '../types';
import { Card } from './ui';

const FIELD_POSITIONS: Position[] = ['LF', 'CF', 'RF', 'SS', '2B', '3B', 'P', '1B', 'C'];

interface Props {
  game: Game;
  players: Player[];
}

export function PositionPanel({ game, players }: Props) {
  const activeLineup = game.lineup.filter((l) => l.isActive && l.position !== 'BN');

  const getPlayerAtPosition = (pos: Position) => {
    const entry = activeLineup.find((l) => l.position === pos);
    if (!entry) return null;
    return players.find((p) => p.id === entry.playerId);
  };

  const bench = game.lineup.filter((l) => l.isActive && l.position === 'BN');

  return (
    <div className="space-y-4">
      <Card className="bg-field-green/5">
        <h4 className="text-sm font-medium text-field-green mb-3 text-center">守備陣容</h4>
        <div className="relative mx-auto max-w-xs aspect-square">
          <div className="absolute inset-0 border-2 border-field-green/30 rounded-full" />
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-16">
            <PosBadge pos="LF" player={getPlayerAtPosition('LF')} order={getOrder('LF', activeLineup)} />
          </div>
          <div className="absolute top-[22%] left-[18%] w-16">
            <PosBadge pos="SS" player={getPlayerAtPosition('SS')} order={getOrder('SS', activeLineup)} />
          </div>
          <div className="absolute top-[22%] right-[18%] w-16">
            <PosBadge pos="2B" player={getPlayerAtPosition('2B')} order={getOrder('2B', activeLineup)} />
          </div>
          <div className="absolute top-[8%] left-[8%] w-16">
            <PosBadge pos="CF" player={getPlayerAtPosition('CF')} order={getOrder('CF', activeLineup)} />
          </div>
          <div className="absolute top-[8%] right-[8%] w-16">
            <PosBadge pos="RF" player={getPlayerAtPosition('RF')} order={getOrder('RF', activeLineup)} />
          </div>
          <div className="absolute top-[42%] left-[8%] w-16">
            <PosBadge pos="3B" player={getPlayerAtPosition('3B')} order={getOrder('3B', activeLineup)} />
          </div>
          <div className="absolute top-[42%] right-[8%] w-16">
            <PosBadge pos="1B" player={getPlayerAtPosition('1B')} order={getOrder('1B', activeLineup)} />
          </div>
          <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 w-16">
            <PosBadge pos="P" player={getPlayerAtPosition('P')} order={getOrder('P', activeLineup)} />
          </div>
          <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-16">
            <PosBadge pos="C" player={getPlayerAtPosition('C')} order={getOrder('C', activeLineup)} />
          </div>
        </div>
      </Card>

      <Card>
        <h4 className="text-sm font-medium text-gray-600 mb-2">守位列表</h4>
        <div className="space-y-2">
          {FIELD_POSITIONS.map((pos) => {
            const player = getPlayerAtPosition(pos);
            const label = POSITIONS.find((p) => p.value === pos)?.label ?? pos;
            return (
              <div key={pos} className="flex justify-between text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium">{player?.name ?? '—'}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {bench.length > 0 && (
        <Card>
          <h4 className="text-sm font-medium text-gray-600 mb-2">板凳</h4>
          {bench.map((entry) => {
            const player = players.find((p) => p.id === entry.playerId);
            return (
              <div key={entry.playerId} className="text-sm py-1">
                #{entry.battingOrder} {player?.name}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function getOrder(pos: Position, lineup: Game['lineup']): number | undefined {
  return lineup.find((l) => l.position === pos)?.battingOrder;
}

function PosBadge({
  pos,
  player,
  order,
}: {
  pos: Position;
  player: Player | null | undefined;
  order?: number;
}) {
  return (
    <div className="bg-white border-2 border-field-green/40 rounded-xl p-1.5 text-center shadow-sm min-h-[52px] flex flex-col justify-center">
      <div className="text-[10px] text-field-green font-bold">{pos}</div>
      <div className="text-xs font-medium truncate">{player?.name ?? '—'}</div>
      {order && <div className="text-[10px] text-gray-400">{order}棒</div>}
    </div>
  );
}

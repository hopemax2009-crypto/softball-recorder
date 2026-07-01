import { useState } from 'react';
import type { Game, Player, Position } from '../types';
import { POSITIONS } from '../types';
import { assignPlayerToPosition } from '../utils/gameLogic';
import { PlayerPickerSheet } from './PlayerPickerSheet';
import { Card } from './ui';

const FIELD_POSITIONS: Position[] = ['LF', 'CF', 'RF', 'SS', '2B', '3B', 'P', '1B', 'C'];
const ALL_ASSIGNABLE: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'EP', 'FLEX'];

interface Props {
  game: Game;
  players: Player[];
  onUpdate?: (game: Game) => void;
  readOnly?: boolean;
  hasBottomNav?: boolean;
}

export function PositionPanel({
  game,
  players,
  onUpdate,
  readOnly = false,
  hasBottomNav = true,
}: Props) {
  const [pickingPosition, setPickingPosition] = useState<Position | null>(null);

  const lineup = game.lineup ?? [];
  const activeLineup = lineup.filter((l) => l.isActive);

  const getPlayerAtPosition = (pos: Position) => {
    const entry = activeLineup.find((l) => l.position === pos);
    if (!entry) return null;
    return players.find((p) => p.id === entry.playerId);
  };

  const getPlayerIdAtPosition = (pos: Position) =>
    activeLineup.find((l) => l.position === pos)?.playerId ?? null;

  const lineupPlayers = activeLineup
    .map((e) => players.find((p) => p.id === e.playerId))
    .filter((p): p is Player => !!p);

  const currentPlayerId = pickingPosition ? getPlayerIdAtPosition(pickingPosition) : null;
  const disabledIds = ALL_ASSIGNABLE.filter((p) => p !== pickingPosition)
    .map((pos) => getPlayerIdAtPosition(pos))
    .filter((id): id is string => !!id && id !== currentPlayerId);

  const canEdit = !readOnly && !!onUpdate;

  const handleSelect = (playerId: string | null) => {
    if (!pickingPosition || !onUpdate || readOnly) return;
    onUpdate(assignPlayerToPosition(game, pickingPosition, playerId));
    setPickingPosition(null);
  };

  const openPicker = (pos: Position) => {
    if (!canEdit) return;
    if (lineupPlayers.length === 0) return;
    setPickingPosition(pos);
  };

  const bench = activeLineup.filter((l) => l.position === 'BN');

  return (
    <div className="space-y-4">
      {!readOnly && onUpdate && (
        <p className="text-sm text-gray-500 px-1">點擊守位選擇球員（不可重複，僅限已排棒次者）</p>
      )}
      {readOnly && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">比賽已完成，守位僅供查閱</p>
      )}

      <Card className="bg-field-green/5">
        <h4 className="text-sm font-medium text-field-green mb-3 text-center">守備陣容</h4>
        <div className="relative mx-auto max-w-xs aspect-square">
          <div className="absolute inset-0 border-2 border-field-green/30 rounded-full" />
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-16">
            <PosBadge pos="LF" player={getPlayerAtPosition('LF')} order={getOrder('LF', activeLineup)} onClick={() => openPicker('LF')} editable={canEdit} />
          </div>
          <div className="absolute top-[22%] left-[18%] w-16">
            <PosBadge pos="SS" player={getPlayerAtPosition('SS')} order={getOrder('SS', activeLineup)} onClick={() => openPicker('SS')} editable={canEdit} />
          </div>
          <div className="absolute top-[22%] right-[18%] w-16">
            <PosBadge pos="2B" player={getPlayerAtPosition('2B')} order={getOrder('2B', activeLineup)} onClick={() => openPicker('2B')} editable={canEdit} />
          </div>
          <div className="absolute top-[8%] left-[8%] w-16">
            <PosBadge pos="CF" player={getPlayerAtPosition('CF')} order={getOrder('CF', activeLineup)} onClick={() => openPicker('CF')} editable={canEdit} />
          </div>
          <div className="absolute top-[8%] right-[8%] w-16">
            <PosBadge pos="RF" player={getPlayerAtPosition('RF')} order={getOrder('RF', activeLineup)} onClick={() => openPicker('RF')} editable={canEdit} />
          </div>
          <div className="absolute top-[42%] left-[8%] w-16">
            <PosBadge pos="3B" player={getPlayerAtPosition('3B')} order={getOrder('3B', activeLineup)} onClick={() => openPicker('3B')} editable={canEdit} />
          </div>
          <div className="absolute top-[42%] right-[8%] w-16">
            <PosBadge pos="1B" player={getPlayerAtPosition('1B')} order={getOrder('1B', activeLineup)} onClick={() => openPicker('1B')} editable={canEdit} />
          </div>
          <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 w-16">
            <PosBadge pos="P" player={getPlayerAtPosition('P')} order={getOrder('P', activeLineup)} onClick={() => openPicker('P')} editable={canEdit} />
          </div>
          <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-16">
            <PosBadge pos="C" player={getPlayerAtPosition('C')} order={getOrder('C', activeLineup)} onClick={() => openPicker('C')} editable={canEdit} />
          </div>
        </div>
      </Card>

      <Card>
        <h4 className="text-sm font-medium text-gray-600 mb-2">守位列表</h4>
        <div className="space-y-2">
          {ALL_ASSIGNABLE.map((pos) => {
            const player = getPlayerAtPosition(pos);
            const label = POSITIONS.find((p) => p.value === pos)?.label ?? pos;
            return (
              <button
                key={pos}
                type="button"
                disabled={!canEdit}
                onClick={() => openPicker(pos)}
                className={`w-full flex justify-between text-sm py-2 px-2 rounded-lg border-b border-gray-50 ${
                  canEdit ? 'active:bg-gray-50' : 'cursor-default'
                }`}
              >
                <span className="text-gray-500">{label}</span>
                <span className="font-medium">{player?.name ?? '—'}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {bench.length > 0 && (
        <Card>
          <h4 className="text-sm font-medium text-gray-600 mb-2">板凳（未守備）</h4>
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

      {lineupPlayers.length === 0 && (
        <p className="text-center text-gray-400 text-sm">請先到「棒次」分頁排定打序</p>
      )}

      {pickingPosition != null && (
        <PlayerPickerSheet
          title={`${POSITIONS.find((p) => p.value === pickingPosition)?.label ?? pickingPosition} — 選擇球員`}
          players={lineupPlayers}
          selectedId={currentPlayerId}
          disabledIds={disabledIds}
          hasBottomNav={hasBottomNav}
          onSelect={handleSelect}
          onClose={() => setPickingPosition(null)}
        />
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
  onClick,
  editable,
}: {
  pos: Position;
  player: Player | null | undefined;
  order?: number;
  onClick?: () => void;
  editable?: boolean;
}) {
  const inner = (
    <>
      <div className="text-[10px] text-field-green font-bold">{pos}</div>
      <div className="text-xs font-medium truncate">{player?.name ?? '—'}</div>
      {order && <div className="text-[10px] text-gray-400">{order}棒</div>}
    </>
  );

  if (editable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full bg-white border-2 border-field-green/40 rounded-xl p-1.5 text-center shadow-sm min-h-[52px] flex flex-col justify-center active:opacity-70"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="bg-white border-2 border-field-green/40 rounded-xl p-1.5 text-center shadow-sm min-h-[52px] flex flex-col justify-center">
      {inner}
    </div>
  );
}

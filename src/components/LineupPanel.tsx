import { useState } from 'react';
import type { Game, Player } from '../types';
import { BATTING_ORDERS } from '../types';
import { assignPlayerToBattingOrder, getPlayerAtBattingOrder } from '../utils/gameLogic';
import { PlayerPickerSheet } from './PlayerPickerSheet';
import { Card } from './ui';

interface Props {
  game: Game;
  players: Player[];
  onUpdate: (game: Game) => void;
  readOnly?: boolean;
  hasBottomNav?: boolean;
}

export function LineupPanel({
  game,
  players,
  onUpdate,
  readOnly = false,
  hasBottomNav = true,
}: Props) {
  const [pickingOrder, setPickingOrder] = useState<number | null>(null);

  const assignedIds = BATTING_ORDERS.map((order) => getPlayerAtBattingOrder(game, order)).filter(
    (id): id is string => !!id
  );
  const currentPlayerId = pickingOrder != null ? getPlayerAtBattingOrder(game, pickingOrder) : null;
  const disabledIds = assignedIds.filter((id) => id !== currentPlayerId);

  const handleSelect = (playerId: string | null) => {
    if (pickingOrder == null || readOnly) return;
    onUpdate(assignPlayerToBattingOrder(game, pickingOrder, playerId));
    setPickingOrder(null);
  };

  return (
    <div className="space-y-3">
      {readOnly ? (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">比賽已完成，棒次設定僅供查閱</p>
      ) : (
        <p className="text-sm text-gray-500 px-1">點擊棒次選擇球員（1–16 棒，不可重複）</p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {BATTING_ORDERS.map((order) => {
          const playerId = getPlayerAtBattingOrder(game, order);
          const player = playerId ? players.find((p) => p.id === playerId) : null;
          return (
            <button
              key={order}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && setPickingOrder(order)}
              className={`rounded-xl border-2 p-2 min-h-[72px] flex flex-col items-center justify-center text-center ${
                player
                  ? 'border-field-green bg-green-50'
                  : 'border-dashed border-gray-300 bg-gray-50'
              } ${readOnly ? 'cursor-default' : 'active:opacity-70'}`}
            >
              <span className="text-lg font-bold text-field-green leading-none">{order}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">棒</span>
              <span className="text-xs font-medium mt-1 truncate w-full px-0.5">
                {player?.name ?? '—'}
              </span>
            </button>
          );
        })}
      </div>

      {assignedIds.length > 0 && (
        <Card className="bg-green-50 !p-3">
          <h4 className="text-sm font-medium text-field-green mb-2">目前打序（{assignedIds.length} 人）</h4>
          <ol className="space-y-1">
            {BATTING_ORDERS.filter((o) => getPlayerAtBattingOrder(game, o)).map((order) => {
              const pid = getPlayerAtBattingOrder(game, order)!;
              const player = players.find((p) => p.id === pid);
              return (
                <li key={order} className="text-sm flex justify-between">
                  <span>{order}. {player?.name ?? '?'}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {players.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">請先到球員頁面新增球員</p>
      )}

      {pickingOrder != null && (
        <PlayerPickerSheet
          title={`${pickingOrder} 棒 — 選擇球員`}
          players={players}
          selectedId={currentPlayerId}
          disabledIds={disabledIds}
          hasBottomNav={hasBottomNav}
          onSelect={handleSelect}
          onClose={() => setPickingOrder(null)}
        />
      )}
    </div>
  );
}

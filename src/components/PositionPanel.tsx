import { useState } from 'react';
import type { Game, Player, Position } from '../types';
import { BATTING_ORDERS, POSITIONS } from '../types';
import {
  assignPlayerToPosition,
  assignPlayerToPositionAndOrder,
  FIELD_POSITIONS,
  getLineupEntryForPlayer,
  getNextAvailableBattingOrder,
  getPlayerAtBattingOrder,
  getPlayerAtPosition,
  isFieldPosition,
} from '../utils/gameLogic';
import { PlayerPickerSheet } from './PlayerPickerSheet';
import { Card } from './ui';

const FIELD_ASSIGNABLE: Position[] = [...FIELD_POSITIONS];

type AssignStep =
  | { phase: 'player'; position: Position }
  | { phase: 'order'; position: Position; playerId: string }
  | null;

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
  const [assignStep, setAssignStep] = useState<AssignStep>(null);

  const lineup = game.lineup ?? [];
  const activeLineup = lineup.filter((l) => l.isActive);

  const findPlayerAtPosition = (pos: Position) => {
    const entry = activeLineup.find((l) => l.position === pos);
    if (!entry) return null;
    return players.find((p) => p.id === entry.playerId);
  };

  const getPlayerIdAtPosition = (pos: Position) => getPlayerAtPosition(game, pos);

  const canEdit = !readOnly && !!onUpdate;

  const closeAssign = () => setAssignStep(null);

  const openPicker = (pos: Position) => {
    if (!canEdit) return;
    if (players.length === 0) return;
    setAssignStep({ phase: 'player', position: pos });
  };

  const handlePlayerSelect = (playerId: string | null) => {
    if (!assignStep || assignStep.phase !== 'player' || !onUpdate) return;
    const { position } = assignStep;

    if (!playerId) {
      onUpdate(assignPlayerToPosition(game, position, null));
      closeAssign();
      return;
    }

    if (getLineupEntryForPlayer(game, playerId)) {
      onUpdate(assignPlayerToPosition(game, position, playerId));
      closeAssign();
      return;
    }

    setAssignStep({ phase: 'order', position, playerId });
  };

  const handleOrderSelect = (order: number) => {
    if (!assignStep || assignStep.phase !== 'order' || !onUpdate) return;
    onUpdate(
      assignPlayerToPositionAndOrder(game, assignStep.position, assignStep.playerId, order)
    );
    closeAssign();
  };

  const pickingPosition = assignStep?.position ?? null;
  const currentPlayerId = pickingPosition ? getPlayerIdAtPosition(pickingPosition) : null;
  const disabledIds =
    assignStep?.phase === 'player' && pickingPosition
      ? FIELD_ASSIGNABLE.filter((p) => p !== pickingPosition)
          .map((pos) => getPlayerIdAtPosition(pos))
          .filter((id): id is string => !!id && id !== currentPlayerId)
      : [];

  const bench = activeLineup.filter((l) => l.position === 'BN');
  const fieldCount = activeLineup.filter((l) => isFieldPosition(l.position)).length;
  const dhEpCount = activeLineup.filter(
    (l) => l.position === 'DH' || l.position === 'EP'
  ).length;

  const orderStepPlayer =
    assignStep?.phase === 'order'
      ? players.find((p) => p.id === assignStep.playerId)
      : null;
  const suggestedOrder = getNextAvailableBattingOrder(game);

  return (
    <div className="space-y-4">
      {!readOnly && onUpdate && (
        <p className="text-sm text-gray-500 px-1">
          點擊守位選擇球員並排定棒次（DH/EP 請至「棒次」分頁設定）
        </p>
      )}
      {readOnly && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">比賽已完成，守位僅供查閱</p>
      )}

      <Card className="bg-field-green/5">
        <h4 className="text-sm font-medium text-field-green mb-3 text-center">守備陣容</h4>
        <div className="relative mx-auto max-w-xs aspect-square">
          <div className="absolute inset-0 border-2 border-field-green/30 rounded-full" />
          {(['LF', 'FLEX', 'CF', 'RF'] as const).map((pos, i) => (
            <div
              key={pos}
              className="absolute top-[5%] w-14 -translate-x-1/2"
              style={{ left: `${12.5 + i * 25}%` }}
            >
              <PosBadge
                pos={pos}
                player={findPlayerAtPosition(pos)}
                order={getOrder(pos, activeLineup)}
                onClick={() => openPicker(pos)}
                editable={canEdit}
              />
            </div>
          ))}
          <div className="absolute top-[22%] left-[18%] w-14">
            <PosBadge pos="SS" player={findPlayerAtPosition('SS')} order={getOrder('SS', activeLineup)} onClick={() => openPicker('SS')} editable={canEdit} />
          </div>
          <div className="absolute top-[22%] right-[18%] w-14">
            <PosBadge pos="2B" player={findPlayerAtPosition('2B')} order={getOrder('2B', activeLineup)} onClick={() => openPicker('2B')} editable={canEdit} />
          </div>
          <div className="absolute top-[42%] left-[8%] w-14">
            <PosBadge pos="3B" player={findPlayerAtPosition('3B')} order={getOrder('3B', activeLineup)} onClick={() => openPicker('3B')} editable={canEdit} />
          </div>
          <div className="absolute top-[42%] right-[8%] w-14">
            <PosBadge pos="1B" player={findPlayerAtPosition('1B')} order={getOrder('1B', activeLineup)} onClick={() => openPicker('1B')} editable={canEdit} />
          </div>
          <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 w-14">
            <PosBadge pos="P" player={findPlayerAtPosition('P')} order={getOrder('P', activeLineup)} onClick={() => openPicker('P')} editable={canEdit} />
          </div>
          <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-14">
            <PosBadge pos="C" player={findPlayerAtPosition('C')} order={getOrder('C', activeLineup)} onClick={() => openPicker('C')} editable={canEdit} />
          </div>
        </div>
      </Card>

      <Card>
        <h4 className="text-sm font-medium text-gray-600 mb-2">守位列表</h4>
        <div className="space-y-2">
          {FIELD_ASSIGNABLE.map((pos) => {
            const player = findPlayerAtPosition(pos);
            const order = getOrder(pos, activeLineup);
            const label = POSITIONS.find((p) => p.value === pos)?.label ?? pos;
            return (
              <button
                key={pos}
                type="button"
                disabled={!canEdit}
                onClick={() => openPicker(pos)}
                className={`w-full flex justify-between items-center text-sm py-2 px-2 rounded-lg border-b border-gray-50 ${
                  canEdit ? 'active:bg-gray-50' : 'cursor-default'
                }`}
              >
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-right">
                  {player?.name ?? '—'}
                  {order != null && (
                    <span className="text-xs text-field-green ml-1.5">{order}棒</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {bench.length > 0 && (
        <Card>
          <h4 className="text-sm font-medium text-gray-600 mb-2">板凳（已排棒次、未守備）</h4>
          <p className="text-xs text-gray-400 mb-2">可至「棒次」分頁微調打序，或點守位指派</p>
          {bench.map((entry) => {
            const player = players.find((p) => p.id === entry.playerId);
            return (
              <div key={entry.playerId} className="text-sm py-1">
                <span className="text-field-green font-bold">{entry.battingOrder}棒</span>{' '}
                {player?.name}
              </div>
            );
          })}
        </Card>
      )}

      {fieldCount > 0 && activeLineup.length > 0 && (
        <p className="text-xs text-center text-gray-400">
          已排 {activeLineup.length} 人 · 守備 {fieldCount} 人
          {dhEpCount > 0 ? ` · DH/EP ${dhEpCount} 人` : ''}
          {bench.length > 0 ? ` · 板凳 ${bench.length} 人` : ''}
        </p>
      )}

      {players.length === 0 && (
        <p className="text-center text-gray-400 text-sm">請先到球員頁面新增球員</p>
      )}

      {assignStep?.phase === 'player' && pickingPosition != null && (
        <PlayerPickerSheet
          title={`${POSITIONS.find((p) => p.value === pickingPosition)?.label ?? pickingPosition} — 選擇球員`}
          players={players}
          selectedId={currentPlayerId}
          disabledIds={disabledIds}
          hasBottomNav={hasBottomNav}
          onSelect={handlePlayerSelect}
          onClose={closeAssign}
        />
      )}

      {assignStep?.phase === 'order' && orderStepPlayer && (
        <BattingOrderPickerSheet
          title={`${orderStepPlayer.name} — 排定棒次`}
          positionLabel={
            POSITIONS.find((p) => p.value === assignStep.position)?.label ?? assignStep.position
          }
          suggestedOrder={suggestedOrder}
          isOrderTaken={(order) => !!getPlayerAtBattingOrder(game, order)}
          hasBottomNav={hasBottomNav}
          onSelect={handleOrderSelect}
          onBack={() =>
            setAssignStep({ phase: 'player', position: assignStep.position })
          }
          onClose={closeAssign}
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
      {order != null && <div className="text-[10px] text-gray-400">{order}棒</div>}
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

function BattingOrderPickerSheet({
  title,
  positionLabel,
  suggestedOrder,
  isOrderTaken,
  hasBottomNav,
  onSelect,
  onBack,
  onClose,
}: {
  title: string;
  positionLabel: string;
  suggestedOrder: number | null;
  isOrderTaken: (order: number) => boolean;
  hasBottomNav: boolean;
  onSelect: (order: number) => void;
  onBack: () => void;
  onClose: () => void;
}) {
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
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-field-green font-medium py-1"
            >
              ← 重選球員
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-lg"
            >
              ✕
            </button>
          </div>
          <p className="font-bold text-base">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">守位：{positionLabel}</p>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          {suggestedOrder != null && (
            <p className="text-xs text-field-green mb-3 text-center">
              建議棒次：{suggestedOrder} 棒（點選確認）
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {BATTING_ORDERS.map((order) => {
              const taken = isOrderTaken(order);
              const suggested = order === suggestedOrder;
              return (
                <button
                  key={order}
                  type="button"
                  disabled={taken}
                  onClick={() => onSelect(order)}
                  className={`rounded-xl border-2 p-2 min-h-[56px] flex flex-col items-center justify-center ${
                    taken
                      ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                      : suggested
                        ? 'border-field-green bg-green-50 active:opacity-70'
                        : 'border-gray-200 bg-white active:opacity-70'
                  }`}
                >
                  <span className="text-lg font-bold text-field-green">{order}</span>
                  <span className="text-[10px] text-gray-400">棒</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

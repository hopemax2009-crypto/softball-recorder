import type { Game, PitcherStats } from '../types';
import { formatEra, getPitcherGameLogs } from '../utils/stats';
import { PitcherRadarChart } from './PitcherRadarChart';
import { StatBox } from './ui';
interface Props {
  stats: PitcherStats;
  games: Game[];
  seasonId?: string;
  onClose: () => void;
  hasBottomNav?: boolean;
}

export function PitcherStatsSheet({
  stats,
  games,
  seasonId,
  onClose,
  hasBottomNav = true,
}: Props) {
  const gameLogs = getPitcherGameLogs(stats.playerId, games, seasonId);
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
      <div className={`fixed inset-x-0 z-[70] bg-white rounded-t-2xl shadow-2xl flex flex-col ${sheetBottom} ${sheetMaxH}`}>
        <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-600">投手統計</p>
              <p className="text-lg font-bold">{stats.playerName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] space-y-4">
          <div className="rounded-xl bg-sky-50 border-2 border-sky-200 p-4 text-center">
            <p className="text-xs text-sky-600 font-medium mb-1">失分 R</p>
            <p className="text-4xl font-bold text-sky-900">{stats.runsAllowed}</p>
            <p className="text-[10px] text-sky-600 mt-2">
              對方得分時紀錄的投手失分
            </p>
          </div>

          <PitcherRadarChart stats={stats} />

          <div className="grid grid-cols-3 gap-2">            <StatBox label="防禦率" value={formatEra(stats.era)} />
            <StatBox label="出賽" value={String(stats.games)} />
            <StatBox label="場均失分" value={stats.runsPerGame.toFixed(2)} />
            <StatBox label="投球半局" value={String(stats.halfInnings)} />
          </div>

          {gameLogs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">逐場失分</h4>
              <div className="space-y-2">
                {gameLogs.map((log) => (
                  <div
                    key={log.gameId}
                    className="flex justify-between items-center text-sm bg-gray-50 rounded-xl px-3 py-2.5"
                  >
                    <div>
                      <p className="font-medium">{log.opponent}</p>
                      <p className="text-xs text-gray-400">{log.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sky-800">{log.runsAllowed} 失分</p>
                      <p className="text-[10px] text-gray-400">{log.halfInnings} 半局</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-400 leading-relaxed">
            雷達圖五軸（越高越好）：防禦率、零失分率、半局失分、出勤度、場均失分。
            防禦率＝(失分×7)÷投球半局數（7局制估算）。
            投球半局於對方半局「完成並下一局」時紀錄（含 0 失分），需指派投手 P。
          </p>        </div>
      </div>
    </>
  );
}

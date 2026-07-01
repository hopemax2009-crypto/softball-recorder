import type { BattingStats } from '../types';
import { formatAvg, formatWobaPlus, getWobaPlusTone } from '../utils/stats';
import { PlayerRadarChart } from './PlayerRadarChart';
import { StatBox } from './ui';

interface Props {
  stats: BattingStats;
  teamAvgWoba: number;
  onClose: () => void;
  hasBottomNav?: boolean;
}

export function PlayerStatsSheet({ stats, teamAvgWoba, onClose, hasBottomNav = true }: Props) {
  const plusTone = getWobaPlusTone(stats.wobaPlus);
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
              <p className="text-xs text-gray-500">球員統計</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-4 text-center">
              <p className="text-xs text-violet-600 font-medium mb-1">慢壘 wOBA</p>
              <p className="text-3xl font-bold text-violet-800">{formatAvg(stats.woba)}</p>
              <p className="text-[10px] text-violet-500 mt-2 leading-snug">
                (0.7×保送+0.9×一安+1.25×二安+1.6×三安+2.0×全壘)÷打席
              </p>
            </div>
            <div className={`rounded-xl border-2 p-4 text-center ${plusTone.bg} ${plusTone.border}`}>
              <p className={`text-xs font-medium mb-1 ${plusTone.label}`}>進攻貢獻分</p>
              <p className={`text-3xl font-bold ${plusTone.value}`}>{formatWobaPlus(stats.wobaPlus)}</p>
              <p className={`text-[10px] mt-2 leading-snug ${plusTone.label}`}>
                全隊平均 {formatAvg(teamAvgWoba)} · 100＝平均水準
              </p>
            </div>
          </div>

          <PlayerRadarChart stats={stats} />

          <div className="grid grid-cols-3 gap-2">
            <StatBox label="打擊率" value={formatAvg(stats.avg)} />
            <StatBox label="上壘率" value={formatAvg(stats.obp)} />
            <StatBox label="長打率" value={formatAvg(stats.slg)} />
            <StatBox label="幸運值" value={formatAvg(stats.luckValue)} />
            <StatBox label="純長打率" value={formatAvg(stats.iso)} />
            <StatBox label="惡運值" value={formatAvg(stats.badLuckValue)} />
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div><span className="font-bold">{stats.games}</span><br /><span className="text-gray-500 text-xs">出賽</span></div>
            <div><span className="font-bold">{stats.pa}</span><br /><span className="text-gray-500 text-xs">打席</span></div>
            <div><span className="font-bold">{stats.ab}</span><br /><span className="text-gray-500 text-xs">打數</span></div>
            <div><span className="font-bold">{stats.h}</span><br /><span className="text-gray-500 text-xs">安打</span></div>
            <div><span className="font-bold">{stats.rbi}</span><br /><span className="text-gray-500 text-xs">打點</span></div>
            <div><span className="font-bold">{stats.singles}</span><br /><span className="text-gray-500 text-xs">一安</span></div>
            <div><span className="font-bold">{stats.doubles}</span><br /><span className="text-gray-500 text-xs">二安</span></div>
            <div><span className="font-bold">{stats.triples}</span><br /><span className="text-gray-500 text-xs">三安</span></div>
            <div><span className="font-bold">{stats.hr}</span><br /><span className="text-gray-500 text-xs">全壘</span></div>
            <div><span className="font-bold">{stats.bb}</span><br /><span className="text-gray-500 text-xs">保送</span></div>
            <div><span className="font-bold">{stats.hbp}</span><br /><span className="text-gray-500 text-xs">觸身</span></div>
            <div><span className="font-bold">{stats.so}</span><br /><span className="text-gray-500 text-xs">三振</span></div>
            <div><span className="font-bold">{stats.fo}</span><br /><span className="text-gray-500 text-xs">飛球出局</span></div>
            <div><span className="font-bold">{stats.go}</span><br /><span className="text-gray-500 text-xs">滾球出局</span></div>
            <div><span className="font-bold">{stats.dp}</span><br /><span className="text-gray-500 text-xs">雙殺</span></div>
            <div><span className="font-bold">{stats.fc}</span><br /><span className="text-gray-500 text-xs">野選</span></div>
            <div><span className="font-bold">{stats.e}</span><br /><span className="text-gray-500 text-xs">失誤</span></div>
            <div><span className="font-bold">{stats.sf}</span><br /><span className="text-gray-500 text-xs">犧飛</span></div>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            打擊率＝安打÷打數 · 上壘率＝(安打+保送+死球)÷(打數+保送+死球+犧飛) ·
            幸運值＝失誤÷打數 · 純長打率＝(二安+三安×2+全壘×3)÷打數 ·
            惡運值＝雙殺÷打數 ·
            進攻貢獻分＝(球員wOBA÷全隊平均wOBA)×100
          </p>
        </div>
      </div>
    </>
  );
}

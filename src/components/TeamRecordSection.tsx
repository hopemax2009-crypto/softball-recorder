import type { Game, Season } from '../types';
import {
  calculateHeadToHead,
  calculateSeasonTeamRecords,
  calculateTeamRecord,
  formatRecord,
  formatWinRate,
} from '../utils/teamRecord';
import { Card, EmptyState } from './ui';

interface Props {
  games: Game[];
  seasons: Season[];
  view: 'season' | 'total';
  seasonId: string;
}

function RecordSummaryCard({ title, record }: { title: string; record: ReturnType<typeof calculateTeamRecord> }) {
  return (
    <Card className="bg-emerald-50 border-emerald-200">
      <h3 className="text-sm font-semibold text-emerald-900">{title}</h3>
      {record.games === 0 ? (
        <p className="text-sm text-emerald-800/70 mt-2">尚無已完成的比賽戰績</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-emerald-700">戰績</p>
            <p className="text-xl font-bold text-emerald-900">{formatRecord(record)}</p>
            <p className="text-xs text-emerald-700 mt-1">共 {record.games} 場</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-emerald-700">勝率</p>
            <p className="text-3xl font-bold text-emerald-900">{formatWinRate(record.winRate)}</p>
            <p className="text-[10px] text-emerald-700 mt-1">和局不計入勝率</p>
          </div>
        </div>
      )}
    </Card>
  );
}

function HeadToHeadTable({ rows }: { rows: ReturnType<typeof calculateHeadToHead> }) {
  if (rows.length === 0) {
    return (
      <Card className="text-center text-sm text-gray-500 py-6">
        尚無對戰戰績（需標記比賽完成且有得分紀錄）
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden !p-0">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">對戰勝率表</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">對手</th>
              <th className="px-3 py-2 font-medium text-center">場次</th>
              <th className="px-3 py-2 font-medium text-center">勝</th>
              <th className="px-3 py-2 font-medium text-center">敗</th>
              <th className="px-3 py-2 font-medium text-center">和</th>
              <th className="px-4 py-2 font-medium text-right">勝率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.opponent} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-800">{row.opponent}</td>
                <td className="px-3 py-2.5 text-center text-gray-600">{row.games}</td>
                <td className="px-3 py-2.5 text-center text-emerald-700 font-semibold">{row.wins}</td>
                <td className="px-3 py-2.5 text-center text-red-600 font-semibold">{row.losses}</td>
                <td className="px-3 py-2.5 text-center text-gray-500">{row.ties || '—'}</td>
                <td className="px-4 py-2.5 text-right font-bold text-emerald-800">{formatWinRate(row.winRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function TeamRecordSection({ games, seasons, view, seasonId }: Props) {
  const seasonFilter = view === 'season' ? seasonId : undefined;
  const summary = calculateTeamRecord(games, seasonFilter);
  const headToHead = calculateHeadToHead(games, seasonFilter);
  const seasonRows = view === 'total' ? calculateSeasonTeamRecords(games, seasons) : [];

  if (view === 'season' && seasons.length === 0) {
    return <EmptyState icon="🏟️" title="尚無賽季" description="此範圍內沒有賽季資料" />;
  }

  return (
    <div className="space-y-4">
      <RecordSummaryCard
        title={view === 'season' ? '本季戰績' : '累計戰績'}
        record={summary}
      />

      {view === 'total' && seasonRows.length > 0 && (
        <Card className="overflow-hidden !p-0">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">各季戰績</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">賽季</th>
                  <th className="px-3 py-2 font-medium text-center">場次</th>
                  <th className="px-3 py-2 font-medium text-center">戰績</th>
                  <th className="px-4 py-2 font-medium text-right">勝率</th>
                </tr>
              </thead>
              <tbody>
                {seasonRows.map((row) => (
                  <tr key={row.seasonId} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.seasonLabel}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{row.games}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{formatRecord(row)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-800">{formatWinRate(row.winRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <HeadToHeadTable rows={headToHead} />

      <p className="text-[10px] text-gray-400 px-1">
        僅統計已標記「比賽完成」且有得分紀錄的場次；勝率 = 勝 ÷（勝 + 敗）。
      </p>
    </div>
  );
}

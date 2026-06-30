import type { BattingStats } from '../types';
import { formatAvg, getRadarScores } from '../utils/stats';

const LABELS = ['打擊率', '上壘率', '幸運值', '惡運值', '長打爆發力'] as const;
const CX = 120;
const CY = 110;
const R = 72;
const LEVELS = [0.25, 0.5, 0.75, 1];

function polar(cx: number, cy: number, radius: number, index: number, total: number) {
  const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / total;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function polygonPoints(scores: number[], scale: number): string {
  return scores
    .map((score, i) => {
      const { x, y } = polar(CX, CY, (score / 100) * R * scale, i, scores.length);
      return `${x},${y}`;
    })
    .join(' ');
}

interface Props {
  stats: BattingStats;
}

export function PlayerRadarChart({ stats }: Props) {
  const scores = getRadarScores(stats);
  const values = [
    formatAvg(stats.avg),
    formatAvg(stats.obp),
    formatAvg(stats.luckValue),
    formatAvg(stats.badLuckValue),
    formatAvg(stats.iso),
  ];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 220" className="w-full max-w-[280px]" aria-label="能力雷達圖">
        {LEVELS.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(scores.map(() => 100), level)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        ))}
        {LABELS.map((_, i) => {
          const outer = polar(CX, CY, R, i, LABELS.length);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={outer.x}
              y2={outer.y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={polygonPoints(scores, 1)}
          fill="rgba(34, 139, 34, 0.25)"
          stroke="#228b22"
          strokeWidth={2}
        />
        {scores.map((_, i) => {
          const pt = polar(CX, CY, (scores[i] / 100) * R, i, LABELS.length);
          return <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#228b22" />;
        })}
        {LABELS.map((label, i) => {
          const { x, y } = polar(CX, CY, R + 22, i, LABELS.length);
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-600 text-[9px]"
            >
              {label}
            </text>
          );
        })}
      </svg>
      <div className="grid grid-cols-5 gap-1 w-full max-w-[280px] text-center text-[10px] text-gray-500 -mt-1">
        {values.map((v, i) => (
          <span key={LABELS[i]} className="font-bold text-field-green">{v}</span>
        ))}
      </div>
    </div>
  );
}

import type { PitcherStats } from '../types';
import {
  getPitcherRadarDisplayValues,
  getPitcherRadarLabels,
  getPitcherRadarScores,
} from '../utils/stats';

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
  stats: PitcherStats;
}

export function PitcherRadarChart({ stats }: Props) {
  const labels = getPitcherRadarLabels();
  const scores = getPitcherRadarScores(stats);
  const values = getPitcherRadarDisplayValues(stats);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 220" className="w-full max-w-[280px]" aria-label="投手能力雷達圖">
        {LEVELS.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(scores.map(() => 100), level)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        ))}
        {labels.map((_, i) => {
          const outer = polar(CX, CY, R, i, labels.length);
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
          fill="rgba(14, 165, 233, 0.25)"
          stroke="#0284c7"
          strokeWidth={2}
        />
        {scores.map((_, i) => {
          const pt = polar(CX, CY, (scores[i] / 100) * R, i, labels.length);
          return <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#0284c7" />;
        })}
        {labels.map((label, i) => {
          const { x, y } = polar(CX, CY, R + 22, i, labels.length);
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
          <span key={labels[i]} className="font-bold text-sky-700">{v}</span>
        ))}
      </div>
    </div>
  );
}

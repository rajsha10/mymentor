import { useEffect, useState, useRef } from 'react';
import { getScoreHistory } from '../../../services/backendApi';
import { TrendingUp, TrendingDown, Minus, Loader } from 'lucide-react';

type Point = { date: string; score: number };

function formatLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function Trend({ points }: { points: Point[] }) {
  if (points.length < 2) return null;
  const delta = points[points.length - 1].score - points[0].score;
  if (delta > 0.3) return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 border-2 border-green-400 rounded-full text-xs font-extrabold text-green-700">
      <TrendingUp className="h-3.5 w-3.5" /> +{delta.toFixed(1)} this week
    </span>
  );
  if (delta < -0.3) return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 border-2 border-red-400 rounded-full text-xs font-extrabold text-red-600">
      <TrendingDown className="h-3.5 w-3.5" /> {delta.toFixed(1)} this week
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 border-2 border-gray-300 rounded-full text-xs font-extrabold text-gray-500">
      <Minus className="h-3.5 w-3.5" /> Holding steady
    </span>
  );
}

// Pure SVG line graph — no dependencies
function LineGraph({ points }: { points: Point[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: Point } | null>(null);

  const W = 500;
  const H = 160;
  const PAD = { top: 16, right: 20, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const scores = points.map(p => p.score);
  const minS = Math.max(0, Math.min(...scores) - 1);
  const maxS = Math.min(10, Math.max(...scores) + 1);

  const xOf = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const yOf = (s: number) => PAD.top + innerH - ((s - minS) / (maxS - minS)) * innerH;

  // Build SVG path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(p.score).toFixed(1)}`)
    .join(' ');

  // Fill area under curve
  const fillD = `${pathD} L ${xOf(points.length - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${xOf(0).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;

  // Y grid lines at 0, 5, 10 (clamped to range)
  const gridVals = [0, 2.5, 5, 7.5, 10].filter(v => v >= minS && v <= maxS);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;

    // Find nearest point
    let best = 0;
    let bestDist = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(xOf(i) - mx);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    if (bestDist < 40) {
      setTooltip({ x: xOf(best), y: yOf(points[best].score), point: points[best] });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <clipPath id="graphClip">
            <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {gridVals.map(v => (
          <g key={v}>
            <line
              x1={PAD.left} x2={PAD.left + innerW}
              y1={yOf(v)} y2={yOf(v)}
              stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3"
            />
            <text
              x={PAD.left - 6} y={yOf(v)}
              textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="#9ca3af" fontWeight="700"
            >
              {v}
            </text>
          </g>
        ))}

        {/* X axis */}
        <line
          x1={PAD.left} x2={PAD.left + innerW}
          y1={PAD.top + innerH} y2={PAD.top + innerH}
          stroke="#000" strokeWidth="2"
        />
        {/* Y axis */}
        <line
          x1={PAD.left} x2={PAD.left}
          y1={PAD.top} y2={PAD.top + innerH}
          stroke="#000" strokeWidth="2"
        />

        {/* Fill area */}
        <path d={fillD} fill="url(#scoreGrad)" clipPath="url(#graphClip)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#000"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath="url(#graphClip)"
        />

        {/* Data points */}
        {points.map((p, i) => {
          const isHovered = tooltip?.point === p;
          const cx = xOf(i);
          const cy = yOf(p.score);
          const color = p.score >= 8 ? '#22c55e' : p.score >= 5 ? '#eab308' : '#ef4444';
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={isHovered ? 7 : 5}
                fill={color} stroke="#000" strokeWidth="2"
                style={{ transition: 'r 0.1s' }}
              />
              {/* X label */}
              <text
                x={cx} y={PAD.top + innerH + 14}
                textAnchor="middle" fontSize="9"
                fill="#6b7280" fontWeight="700"
              >
                {formatLabel(p.date)}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const { x, y, point } = tooltip;
          const bw = 58; const bh = 34;
          const bx = Math.min(x - bw / 2, W - bw - 4);
          const by = y - bh - 10;
          return (
            <g>
              <rect x={bx} y={by} width={bw} height={bh}
                rx="6" fill="#000" stroke="#000" strokeWidth="1.5"
              />
              {/* Neobrutalist shadow */}
              <rect x={bx + 2} y={by + 2} width={bw} height={bh}
                rx="6" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.2"
              />
              <text x={bx + bw / 2} y={by + 13}
                textAnchor="middle" fontSize="11" fill="#fff" fontWeight="800"
              >
                {point.score} / 10
              </text>
              <text x={bx + bw / 2} y={by + 26}
                textAnchor="middle" fontSize="8.5" fill="#9ca3af" fontWeight="600"
              >
                {formatLabel(point.date)}
              </text>
              {/* Pointer */}
              <polygon
                points={`${x - 5},${by + bh} ${x + 5},${by + bh} ${x},${y - 4}`}
                fill="#000"
              />
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

export default function ScoreGraph() {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScoreHistory()
      .then(d => setPoints(d.points))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, []);

  const latest = points[points.length - 1]?.score ?? null;
  const latestColor =
    latest === null ? 'text-gray-400'
    : latest >= 8   ? 'text-green-600'
    : latest >= 5   ? 'text-yellow-600'
                    : 'text-red-500';

  return (
    <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b-2 border-black bg-[#FAFAFA] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-full border-2 border-black flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-base font-extrabold text-black">📈 Score Over Time</h3>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!loading && points.length > 0 && (
            <>
              <span className={`text-2xl font-extrabold ${latestColor}`}>
                {latest} <span className="text-sm font-bold text-gray-400">/ 10</span>
              </span>
              <Trend points={points} />
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-3 text-gray-400">
            <Loader className="h-5 w-5 animate-spin text-black" />
            <span className="font-bold text-sm">Loading your history…</span>
          </div>
        ) : points.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-gray-300" />
            </div>
            <div>
              <p className="font-bold text-sm text-black">No history yet</p>
              <p className="text-xs font-medium mt-0.5">Your score graph will appear after your first active day.</p>
            </div>
          </div>
        ) : points.length === 1 ? (
          // Only one day — show a single dot with message
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className={`text-2xl font-extrabold ${latestColor}`}>{latest}</span>
            </div>
            <p className="text-xs font-bold text-gray-400">Come back tomorrow to see your trend</p>
          </div>
        ) : (
          <LineGraph points={points} />
        )}
      </div>

      {/* Legend */}
      {!loading && points.length > 1 && (
        <div className="px-8 pb-5 flex items-center gap-4 flex-wrap">
          {[
            { color: 'bg-green-500', label: '8–10' },
            { color: 'bg-yellow-400', label: '5–7' },
            { color: 'bg-red-500',   label: '< 5'  },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
              <span className={`w-2.5 h-2.5 rounded-full ${color} border border-black`} />
              {label}
            </span>
          ))}
          <span className="text-xs font-bold text-gray-400 ml-auto">Last {points.length} active days</span>
        </div>
      )}
    </div>
  );
}

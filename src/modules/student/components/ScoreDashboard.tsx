import { Zap, Brain, Calendar } from 'lucide-react';

type LearningInsights = {
  by_classroom: {
    classroom_id: string;
    weak_areas: { topic: string; total_queries: number; low_confidence_count: number; weak_score: number }[];
    query_count: number;
  }[];
  overall_confidence: 'High' | 'Medium' | 'Low';
  last_activity: string | null;
  total_queries: number;
};

type ScoreColor = 'green' | 'yellow' | 'red';

function scoreColor(score: number): ScoreColor {
  if (score >= 8) return 'green';
  if (score >= 5) return 'yellow';
  return 'red';
}

const colorMap: Record<ScoreColor, { dot: string; bg: string; border: string; text: string; badge: string }> = {
  green:  { dot: '🟢', bg: 'bg-green-50',  border: 'border-green-400', text: 'text-green-700', badge: 'bg-green-100' },
  yellow: { dot: '🟡', bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', badge: 'bg-yellow-100' },
  red:    { dot: '🔴', bg: 'bg-red-50',    border: 'border-red-400',   text: 'text-red-700',   badge: 'bg-red-100' },
};

function deriveScores(insights: LearningInsights) {
  const total = insights.total_queries;

  // Engagement: mirrors compute_engagement thresholds from student_score.py
  let engagement: number;
  if (total > 50) engagement = 10;
  else if (total > 20) engagement = 7;
  else if (total > 5) engagement = 5;
  else engagement = 2;

  // Understanding: from overall_confidence level
  const confMap: Record<string, number> = { High: 10, Medium: 6.67, Low: 3.33 };
  const understanding = Math.round((confMap[insights.overall_confidence] ?? 6.67) * 10) / 10;

  // Consistency: unique active days across all classrooms (approximated from query_count spread)
  // We use classroom count as a proxy — more classrooms active = more consistent
  const activeClassrooms = insights.by_classroom.filter(c => c.query_count > 0).length;
  let consistency: number;
  if (activeClassrooms > 3) consistency = 10;
  else if (activeClassrooms > 1) consistency = 7;
  else if (activeClassrooms === 1) consistency = 5;
  else consistency = 2;

  const final = Math.round((0.4 * engagement + 0.4 * understanding + 0.2 * consistency) * 10) / 10;

  return { engagement, understanding, consistency, final };
}

function buildInsightLine(engagement: number, understanding: number, consistency: number): string {
  const scores = [
    { label: 'engagement', value: engagement },
    { label: 'understanding', value: understanding },
    { label: 'consistency', value: consistency },
  ];
  const best = scores.reduce((a, b) => (a.value >= b.value ? a : b));
  const worst = scores.reduce((a, b) => (a.value <= b.value ? a : b));

  if (best.value >= 8 && worst.value >= 5) {
    return "You're performing well across all areas — keep it up!";
  }
  if (worst.value < 5) {
    return `You're doing well in ${best.label} but need to improve ${worst.label}.`;
  }
  return `Strong ${best.label} — push your ${worst.label} to reach the next level.`;
}

const breakdownCards = [
  { key: 'engagement' as const, label: 'Engagement', icon: Zap, desc: 'How often you interact with your agents' },
  { key: 'understanding' as const, label: 'Understanding', icon: Brain, desc: 'Confidence level across your answers' },
  { key: 'consistency' as const, label: 'Consistency', icon: Calendar, desc: 'Active across multiple classrooms' },
];

type Props = {
  insights: LearningInsights;
  loading: boolean;
};

export default function ScoreDashboard({ insights, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-gray-100 rounded-4xl animate-pulse border-2 border-black" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse border-2 border-black" />)}
        </div>
      </div>
    );
  }

  const { engagement, understanding, consistency, final } = deriveScores(insights);
  const finalColor = scoreColor(final);
  const colors = colorMap[finalColor];
  const insight = buildInsightLine(engagement, understanding, consistency);

  return (
    <div className="space-y-4">
      {/* Hero Card */}
      <div className={`rounded-4xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 ${colors.bg} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6`}>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Your Learning Score</p>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-7xl font-extrabold text-black leading-none">{final}</span>
            <span className="text-2xl font-bold text-gray-400">/ 10</span>
            <span className="text-4xl">{colors.dot}</span>
          </div>
          <p className={`text-sm font-bold ${colors.text} bg-white/60 inline-block px-4 py-2 rounded-full border ${colors.border}`}>
            {insight}
          </p>
        </div>
        <div className="shrink-0 w-32 h-32 rounded-full border-[6px] border-black flex items-center justify-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-center">
            <p className="text-4xl font-extrabold text-black leading-none">{final}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Score</p>
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {breakdownCards.map(({ key, label, icon: Icon, desc }) => {
          const val = { engagement, understanding, consistency }[key];
          const c = colorMap[scoreColor(val)];
          return (
            <div
              key={key}
              className={`rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col gap-3 ${c.bg}`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-black ${c.badge}`}>
                  <Icon className="w-5 h-5 text-black" />
                </div>
                <span className="text-3xl font-extrabold text-black">{val}</span>
              </div>
              <div>
                <p className="font-extrabold text-black text-sm">{label}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{desc}</p>
              </div>
              <div className="w-full bg-white/60 rounded-full h-2 border border-gray-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${scoreColor(val) === 'green' ? 'bg-green-500' : scoreColor(val) === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`}
                  style={{ width: `${val * 10}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

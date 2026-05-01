import { useState, useEffect, useMemo } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../config/firebase';
import { getClassroomLeaderboard, getClassroomWeakTopics, getClassroomAgentUsage, listAgents } from '../../../services/backendApi';
import { BarChart2, Users, TrendingUp, Zap, Brain, Activity, Loader, AlertTriangle, Star, ChevronUp, ChevronDown, ChevronsUpDown, Filter, X, BookOpen, Eye, Flame, Target, Bot, MessageSquare, TrendingDown, FlaskConical, Upload, Share2, Clock, Copy, Check } from 'lucide-react';

type StudentEntry = {
  user_id: string;
  name: string;
  final: number;
  engagement: number;
  understanding: number;
  consistency: number;
};

type WeakTopic = {
  topic: string;
  struggling_count: number;
  total_with_topic: number;
  struggling_pct: number;
  struggling_user_ids: string[];
};

type AgentUsage = {
  agent_id: string;
  name: string;
  bot_type: 'homework' | 'assignments' | 'tests' | null;
  query_count: number;
};

function scoreColor(score: number) {
  if (score >= 8) return { dot: '🟢', bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', bar: 'bg-green-400' };
  if (score >= 5) return { dot: '🟡', bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', bar: 'bg-yellow-400' };
  return              { dot: '🔴', bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-600',   bar: 'bg-red-400' };
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

type StatCardProps = {
  label: string;
  value: string | number;
  dot?: string;
  icon: React.ReactNode;
  accent: string;
};

function StatCard({ label, value, dot, icon, accent }: StatCardProps) {
  return (
    <div className={`flex items-center gap-4 p-5 rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
      <div className={`w-11 h-11 rounded-full ${accent} border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-2xl font-extrabold text-black leading-tight">
          {value}{dot && <span className="ml-1 text-lg">{dot}</span>}
        </p>
      </div>
    </div>
  );
}

type MiniBarProps = { label: string; value: number; barColor: string };
function MiniBar({ label, value, barColor }: MiniBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full border border-black h-3 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(100, (value / 10) * 100)}%` }}
        />
      </div>
      <span className="text-xs font-extrabold text-black w-8 text-right">{value}</span>
    </div>
  );
}

// Derive human-readable weakness reasons from scores
function weakReasons(e: StudentEntry): string[] {
  const reasons: string[] = [];
  if (e.consistency < 5)   reasons.push('Low consistency — not studying regularly');
  if (e.understanding < 5) reasons.push('Low understanding — struggling with concepts');
  if (e.engagement < 5)    reasons.push('Low engagement — rarely asking questions');
  if (e.consistency >= 5 && e.consistency < 7) reasons.push('Inconsistent study habit');
  if (e.understanding >= 5 && e.understanding < 7) reasons.push('Partial understanding — needs more practice');
  if (e.engagement >= 5 && e.engagement < 7)    reasons.push('Moderate engagement — could ask more');
  return reasons.length ? reasons : ['Overall score is low — needs general support'];
}

// Slide-in drawer showing a single student's detail + actions
function StudentDrawer({
  student,
  classroomFirestoreId,
  onClose,
}: {
  student: StudentEntry;
  classroomFirestoreId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const sc  = scoreColor(student.final);
  const reasons = weakReasons(student);

  const metrics: { label: string; key: keyof StudentEntry; icon: React.ReactNode; bar: string }[] = [
    { label: 'Engagement',    key: 'engagement',    icon: <Zap     className="h-4 w-4 text-brand-coral" />, bar: 'bg-brand-coral' },
    { label: 'Understanding', key: 'understanding', icon: <Brain   className="h-4 w-4 text-blue-500"  />, bar: 'bg-blue-400'  },
    { label: 'Consistency',   key: 'consistency',   icon: <Activity className="h-4 w-4 text-green-500"/>, bar: 'bg-green-400' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-white border-l-2 border-black shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b-2 border-black bg-brand-light shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-extrabold text-lg ${sc.bg}`}>
              {student.name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-extrabold text-black text-base leading-tight">{student.name}</p>
              <p className={`text-xs font-bold ${sc.text}`}>
                {sc.dot} {student.final >= 8 ? 'Top Student' : student.final < 5 ? 'Needs Attention' : 'On Track'} · {student.final}/10
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-6">
          {/* Score breakdown */}
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Score Breakdown</p>
            <div className="space-y-3">
              {metrics.map(m => {
                const val = student[m.key] as number;
                const mc  = scoreColor(val);
                return (
                  <div key={m.label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-black">
                        {m.icon} {m.label}
                      </span>
                      <span className={`text-xs font-extrabold ${mc.text}`}>{val}/10 {mc.dot}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full border border-black h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.bar} transition-all duration-500`}
                        style={{ width: `${(val / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Diagnosis */}
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">AI Diagnosis</p>
            <div className="space-y-2">
              {reasons.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-4 py-3 rounded-xl border-2 border-black bg-red-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-700">{r}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What teacher can do */}
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Recommended Actions</p>
            <div className="space-y-2">
              {student.consistency < 7 && (
                <p className="text-xs font-bold text-gray-600 flex items-start gap-2">
                  <span className="text-black shrink-0">→</span> Remind them to log in and practice daily
                </p>
              )}
              {student.understanding < 7 && (
                <p className="text-xs font-bold text-gray-600 flex items-start gap-2">
                  <span className="text-black shrink-0">→</span> Assign focused practice on weak topics
                </p>
              )}
              {student.engagement < 7 && (
                <p className="text-xs font-bold text-gray-600 flex items-start gap-2">
                  <span className="text-black shrink-0">→</span> Encourage them to ask more questions to the AI agent
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons — sticky footer */}
        <div className="px-6 py-5 border-t-2 border-black bg-brand-light shrink-0 space-y-3">
          <button
            onClick={() => { onClose(); navigate(`/classroom/${classroomFirestoreId}`); }}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-black text-white font-extrabold text-sm border-2 border-black rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-brand-coral hover:border-brand-coral transition-all"
          >
            <BookOpen className="h-4 w-4" />
            Assign Practice
          </button>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white text-black font-extrabold text-sm border-2 border-black rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 transition-all"
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>
        </div>
      </div>
    </>
  );
}

type SortKey = 'name' | 'final' | 'engagement' | 'understanding' | 'consistency';
type SortDir = 'asc' | 'desc';
type FilterMode = 'all' | 'weak' | 'top';

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />;
  return dir === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 text-black" />
    : <ChevronDown className="h-3.5 w-3.5 text-black" />;
}

// Share Agent Dialog
function ShareAgentDialog({ visibleAgentIds, onClose }: { visibleAgentIds: string[]; onClose: () => void }) {
  const [agents, setAgents] = useState<{ id: string; name: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    listAgents()
      .then(all => setAgents(all.filter(a => visibleAgentIds.includes(a.id))))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [visibleAgentIds]);

  function copyLink(agentId: string) {
    const url = `${window.location.origin}${window.location.pathname}?agent=${agentId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(agentId);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-green-50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Share2 className="h-4 w-4 text-black" />
              </div>
              <div>
                <p className="font-extrabold text-black text-base leading-tight">Share Agent</p>
                <p className="text-xs font-bold text-gray-400">Select an agent to share its link</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-3 max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8 gap-3 text-gray-400">
                <Loader className="h-5 w-5 animate-spin text-black" />
                <p className="text-sm font-bold">Loading agents…</p>
              </div>
            )}
            {!loading && agents.length === 0 && (
              <div className="flex items-center gap-3 px-4 py-5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <Bot className="h-5 w-5 shrink-0" />
                <p className="text-sm font-bold">No agents are shared with this classroom yet.</p>
              </div>
            )}
            {!loading && agents.map(agent => (
              <div
                key={agent.id}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="w-9 h-9 rounded-full bg-purple-100 border-2 border-black flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-black text-sm truncate">{agent.name}</p>
                  {agent.description && (
                    <p className="text-xs text-gray-400 font-medium truncate">{agent.description}</p>
                  )}
                </div>
                <button
                  onClick={() => copyLink(agent.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-full text-xs font-extrabold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 ${
                    copied === agent.id
                      ? 'bg-green-400 text-black'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  {copied === agent.id ? (
                    <><Check className="h-3.5 w-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy Link</>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t-2 border-black bg-brand-light rounded-b-2xl">
            <p className="text-xs font-bold text-gray-400 text-center">
              Students can open the link to chat directly with the selected agent.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ClassDashboard({ classroom, onNavigateTab }: { classroom: any; onNavigateTab?: (tab: string) => void }) {
  const [entries, setEntries] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('final');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentEntry | null>(null);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [agentUsage, setAgentUsage] = useState<AgentUsage[]>([]);
  const [agentUsageLoading, setAgentUsageLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  useEffect(() => {
    const students: { uid: string }[] = classroom.students ?? [];
    if (!students.length) { setEntries([]); return; }

    setLoading(true);
    setError('');

    const uids = students.map(s => s.uid);

    // Fetch names from Firestore in parallel
    Promise.all(uids.map(uid => getDoc(doc(db, 'users', uid))))
      .then(async (docs) => {
        const nameMap: Record<string, string> = {};
        docs.forEach((d, i) => {
          nameMap[uids[i]] = (d.data() as any)?.name ?? 'Student';
        });

        const data = await getClassroomLeaderboard(classroom.id, uids);
        const merged: StudentEntry[] = data.entries.map(e => ({
          ...e,
          name: nameMap[e.user_id] ?? 'Student',
        }));
        setEntries(merged);
      })
      .catch(err => setError(err.message || 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, [classroom.id, classroom.students]);

  // Fetch class-wide weak topics independently
  useEffect(() => {
    const students: { uid: string }[] = classroom.students ?? [];
    if (!students.length) { setWeakTopics([]); return; }
    const uids = students.map(s => s.uid);
    setTopicsLoading(true);
    getClassroomWeakTopics(classroom.id, uids)
      .then(data => setWeakTopics(data.topics))
      .catch(() => setWeakTopics([]))
      .finally(() => setTopicsLoading(false));
  }, [classroom.id, classroom.students]);

  // Fetch agent usage for this classroom
  useEffect(() => {
    setAgentUsageLoading(true);
    getClassroomAgentUsage(classroom.id)
      .then(data => setAgentUsage(data.agents))
      .catch(() => setAgentUsage([]))
      .finally(() => setAgentUsageLoading(false));
  }, [classroom.id]);

  const totalStudents = classroom.students?.length ?? 0;

  // Class-wide aggregates
  const avgScore       = avg(entries.map(e => e.final));
  const avgEngagement  = avg(entries.map(e => e.engagement));
  const avgUnderstand  = avg(entries.map(e => e.understanding));
  const avgConsistency = avg(entries.map(e => e.consistency));

  const topPerformer   = entries.length ? [...entries].sort((a, b) => b.final - a.final)[0] : null;
  const needsAttention = entries.filter(e => e.final < 5);
  const sc             = scoreColor(avgScore);

  const tableRows = useMemo(() => {
    let rows = [...entries];
    if (filter === 'weak') rows = rows.filter(e => e.final < 5);
    if (filter === 'top')  rows = rows.filter(e => e.final >= 8);
    rows.sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rows;
  }, [entries, sortKey, sortDir, filter]);

  return (
    <div className="p-6 sm:p-10 space-y-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-coral rounded-full border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <BarChart2 className="h-6 w-6 text-black" />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-black leading-none">Class Analytics</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">AI-powered insights for {classroom.name}</p>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <section>
        <h3 className="text-lg font-extrabold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-brand-coral rounded-full inline-block" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigateTab?.('tests')}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-[#FFF0EE] border-2 border-black flex items-center justify-center group-hover:bg-brand-coral shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <FlaskConical className="h-5 w-5 text-black" />
            </div>
            <span className="text-sm font-extrabold">Create Test</span>
          </button>

          <button
            onClick={() => onNavigateTab?.('materials')}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-blue-100 border-2 border-black flex items-center justify-center group-hover:bg-blue-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Upload className="h-5 w-5 text-black" />
            </div>
            <span className="text-sm font-extrabold">Upload Notes</span>
          </button>

          <button
            onClick={() => setShareDialogOpen(true)}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-green-100 border-2 border-black flex items-center justify-center group-hover:bg-green-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Share2 className="h-5 w-5 text-black" />
            </div>
            <span className="text-sm font-extrabold">Share Agent</span>
          </button>

          <button
            onClick={() => {
              document.getElementById('needs-attention-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all group"
          >
            <div className={`w-11 h-11 rounded-full ${needsAttention.length > 0 ? 'bg-red-200' : 'bg-gray-100'} border-2 border-black flex items-center justify-center group-hover:bg-red-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative`}>
              <Users className="h-5 w-5 text-black" />
              {needsAttention.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B57] border-2 border-black rounded-full text-[10px] font-extrabold flex items-center justify-center text-black">
                  {needsAttention.length}
                </span>
              )}
            </div>
            <span className="text-sm font-extrabold">View Weak Students</span>
          </button>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
          <Loader className="h-8 w-8 animate-spin text-black" />
          <p className="font-bold text-sm">Crunching class data…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl px-6 py-4 text-red-600 font-bold text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* No students yet */}
      {!loading && !error && totalStudents === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-black flex items-center justify-center">
            <Users className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-extrabold text-black text-lg">No students enrolled yet</p>
          <p className="text-gray-500 text-sm font-medium">Analytics will appear once students join and interact with agents.</p>
        </div>
      )}

      {/* No backend data yet */}
      {!loading && !error && totalStudents > 0 && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-black flex items-center justify-center">
            <BarChart2 className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-extrabold text-black text-lg">No activity data yet</p>
          <p className="text-gray-500 text-sm font-medium">{totalStudents} student{totalStudents !== 1 ? 's' : ''} enrolled — analytics appear after they chat with agents.</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          {/* ── Class Overview ── */}
          <section>
            <h3 className="text-lg font-extrabold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-brand-coral rounded-full inline-block" />
              Class Overview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Average Score"
                value={avgScore}
                dot={sc.dot}
                icon={<TrendingUp className="h-5 w-5 text-black" />}
                accent="bg-brand-coral"
              />
              <StatCard
                label="Top Performer"
                value={topPerformer ? topPerformer.name.split(' ')[0] : '—'}
                dot={topPerformer ? `(${topPerformer.final})` as any : undefined}
                icon={<Star className="h-5 w-5 text-black" />}
                accent="bg-yellow-400"
              />
              <StatCard
                label="Total Students"
                value={totalStudents}
                icon={<Users className="h-5 w-5 text-black" />}
                accent="bg-blue-200"
              />
              <StatCard
                label="Needs Attention"
                value={`${needsAttention.length} students`}
                dot={needsAttention.length > 0 ? '🔴' : '🟢'}
                icon={<AlertTriangle className="h-5 w-5 text-black" />}
                accent={needsAttention.length > 0 ? 'bg-red-200' : 'bg-green-200'}
              />
            </div>
          </section>

          {/* ── Class Averages ── */}
          <section>
            <h3 className="text-lg font-extrabold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-black rounded-full inline-block" />
              Class Averages
            </h3>
            <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-black bg-[#FFF0EE] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Zap className="h-5 w-5 text-brand-coral" />
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Engagement</p>
                    <p className="text-2xl font-extrabold text-black">{avgEngagement} <span className="text-sm text-gray-400">/ 10</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-black bg-blue-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Understanding</p>
                    <p className="text-2xl font-extrabold text-black">{avgUnderstand} <span className="text-sm text-gray-400">/ 10</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-black bg-green-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Activity className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Consistency</p>
                    <p className="text-2xl font-extrabold text-black">{avgConsistency} <span className="text-sm text-gray-400">/ 10</span></p>
                  </div>
                </div>
              </div>
              {/* Bar breakdown */}
              <div className="space-y-3">
                <MiniBar label="Engagement"   value={avgEngagement}  barColor="bg-brand-coral" />
                <MiniBar label="Understanding" value={avgUnderstand}  barColor="bg-blue-400" />
                <MiniBar label="Consistency"  value={avgConsistency} barColor="bg-green-400" />
                <MiniBar label="Overall Score" value={avgScore}       barColor={sc.bar} />
              </div>
            </div>
          </section>

          {/* ── Topic-Level Insights ── */}
          <section>
            <h3 className="text-lg font-extrabold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-400 rounded-full inline-block" />
              Class Weak Topics
              {!topicsLoading && weakTopics.length > 0 && (
                <span className="ml-1 px-2.5 py-0.5 bg-blue-100 border-2 border-blue-400 rounded-full text-blue-700 text-sm font-extrabold">
                  {weakTopics.length}
                </span>
              )}
            </h3>

            {topicsLoading && (
              <div className="flex items-center gap-3 py-6 text-gray-400">
                <Loader className="h-5 w-5 animate-spin text-black" />
                <p className="text-sm font-bold">Analysing topic data…</p>
              </div>
            )}

            {!topicsLoading && weakTopics.length === 0 && (
              <div className="flex items-center gap-3 px-6 py-5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                <Target className="h-5 w-5 shrink-0" />
                <p className="text-sm font-bold">No class-wide weak topics detected yet.</p>
              </div>
            )}

            {!topicsLoading && weakTopics.length > 0 && (
              <div className="space-y-3">
                {weakTopics.map((t, i) => {
                  // severity based on % struggling
                  const severe = t.struggling_pct >= 60;
                  const moderate = t.struggling_pct >= 35;
                  const severityBg     = severe ? 'bg-red-50 border-red-300'    : moderate ? 'bg-yellow-50 border-yellow-300'    : 'bg-blue-50 border-blue-200';
                  const barColor       = severe ? 'bg-red-400'                  : moderate ? 'bg-yellow-400'                     : 'bg-blue-300';
                  const pctTextColor   = severe ? 'text-red-600'                : moderate ? 'text-yellow-700'                   : 'text-blue-700';
                  const badgeBg        = severe ? 'bg-red-100 border-red-400 text-red-700'   : moderate ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 'bg-blue-100 border-blue-300 text-blue-700';
                  const icon           = severe ? <Flame className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />;

                  // Resolve struggling student names from entries map
                  const nameMap = Object.fromEntries(entries.map(e => [e.user_id, e.name]));
                  const strugglingNames = t.struggling_user_ids
                    .map(uid => nameMap[uid])
                    .filter(Boolean);

                  return (
                    <div
                      key={t.topic}
                      className={`rounded-2xl border-2 ${severityBg} shadow-[3px_3px_0px_0px_rgba(0,0,0,0.12)] p-5`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Rank bubble */}
                        <div className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          {i + 1}
                        </div>

                        {/* Topic name + badge */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="font-extrabold text-black text-base capitalize">{t.topic}</p>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-extrabold ${badgeBg}`}>
                              {icon}
                              {severe ? 'Critical' : moderate ? 'Moderate' : 'Mild'}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-white rounded-full border border-black h-3 overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full ${barColor} transition-all duration-700`}
                                style={{ width: `${t.struggling_pct}%` }}
                              />
                            </div>
                            <span className={`text-sm font-extrabold shrink-0 ${pctTextColor}`}>
                              {t.struggling_pct}% struggling
                            </span>
                          </div>

                          {/* Count label */}
                          <p className="text-xs text-gray-500 font-bold mt-1.5">
                            {t.struggling_count} of {t.total_with_topic} student{t.total_with_topic !== 1 ? 's' : ''} who studied this topic are struggling
                          </p>

                          {/* Struggling student name chips */}
                          {strugglingNames.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {strugglingNames.map(name => (
                                <span
                                  key={name}
                                  className="px-2.5 py-0.5 bg-white border-2 border-black rounded-full text-xs font-extrabold text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-black hover:text-white transition-colors"
                                  onClick={() => {
                                    const student = entries.find(e => e.name === name);
                                    if (student) setSelectedStudent(student);
                                  }}
                                >
                                  {name.split(' ')[0]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Students Needing Attention ── */}
          {needsAttention.length > 0 && (
            <section id="needs-attention-section">
              <h3 className="text-lg font-extrabold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-red-400 rounded-full inline-block" />
                Students Needing Attention
                <span className="ml-1 px-2.5 py-0.5 bg-red-100 border-2 border-red-400 rounded-full text-red-600 text-sm font-extrabold">
                  {needsAttention.length}
                </span>
              </h3>
              <div className="space-y-3">
                {needsAttention.map(e => {
                  const reasons = weakReasons(e);
                  return (
                    <div
                      key={e.user_id}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border-2 border-red-300 bg-red-50 shadow-[3px_3px_0px_0px_rgba(239,68,68,0.35)]"
                    >
                      {/* Avatar + name + reason */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full border-2 border-black bg-red-200 flex items-center justify-center font-extrabold text-base shrink-0">
                          {e.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-black text-sm truncate">{e.name}</p>
                          <p className="text-xs font-bold text-red-600 mt-0.5 truncate">
                            ⚠️ {reasons[0]}
                          </p>
                          {reasons[1] && (
                            <p className="text-xs font-bold text-red-500 truncate">
                              ⚠️ {reasons[1]}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Score chips */}
                      <div className="flex items-center gap-2 shrink-0">
                        {([
                          { label: 'Eng', val: e.engagement },
                          { label: 'Und', val: e.understanding },
                          { label: 'Con', val: e.consistency },
                        ]).map(({ label, val }) => {
                          const c = scoreColor(val);
                          return (
                            <span key={label} className={`px-2.5 py-1 rounded-full border border-black text-xs font-extrabold ${c.bg} ${c.text}`}>
                              {label} {val}
                            </span>
                          );
                        })}
                        <span className="px-3 py-1 rounded-full border-2 border-black bg-red-200 text-red-700 text-sm font-extrabold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          {e.final}/10
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedStudent(e)}
                          className="flex items-center gap-1.5 px-4 py-2 border-2 border-black rounded-full text-xs font-extrabold bg-white text-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </button>
                        <button
                          onClick={() => setSelectedStudent(e)}
                          className="flex items-center gap-1.5 px-4 py-2 border-2 border-black rounded-full text-xs font-extrabold bg-black text-white hover:bg-brand-coral hover:border-brand-coral transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Assign Practice
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Student Performance Table ── */}
          <section>
            {/* Section header + controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-lg font-extrabold text-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-6 bg-yellow-400 rounded-full inline-block" />
                Student Performance
              </h3>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                {(['all', 'top', 'weak'] as FilterMode[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-full border-2 border-black text-xs font-extrabold uppercase tracking-wide transition-all ${
                      filter === f
                        ? f === 'weak'
                          ? 'bg-red-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                          : f === 'top'
                          ? 'bg-green-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                          : 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'top' ? '🌟 Top (≥8)' : '⚠️ Weak (<5)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[2rem_1fr_repeat(4,7rem)_6rem] items-center bg-black text-white px-5 py-3 text-xs font-extrabold uppercase tracking-widest gap-2">
                <span>#</span>
                {/* Name column — sortable */}
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-left hover:text-gray-300 transition-colors"
                >
                  Student <SortIcon col="name" sortKey={sortKey} dir={sortDir} />
                </button>
                {/* Numeric columns — sortable */}
                {([
                  { key: 'engagement',    label: 'Eng' },
                  { key: 'understanding', label: 'Und' },
                  { key: 'consistency',   label: 'Con' },
                  { key: 'final',         label: 'Score' },
                ] as { key: SortKey; label: string }[]).map((col) => (
                  <button
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="flex items-center justify-end gap-1 hover:text-gray-300 transition-colors w-full"
                  >
                    {col.label} <SortIcon col={col.key} sortKey={sortKey} dir={sortDir} />
                  </button>
                ))}
                <span className="text-right">Action</span>
              </div>

              {/* Rows */}
              {tableRows.length === 0 ? (
                <div className="py-12 text-center text-sm font-bold text-gray-400">
                  No students match this filter.
                </div>
              ) : (
                <ul className="divide-y-2 divide-black">
                  {tableRows.map((e, i) => {
                    const sc = scoreColor(e.final);
                    const engC  = scoreColor(e.engagement);
                    const undC  = scoreColor(e.understanding);
                    const conC  = scoreColor(e.consistency);
                    return (
                      <li
                        key={e.user_id}
                        className={`grid grid-cols-[2rem_1fr_repeat(4,7rem)_6rem] items-center px-5 py-4 gap-2 hover:bg-brand-light transition-colors`}
                      >
                        {/* Rank */}
                        <span className="text-xs font-extrabold text-gray-400 text-center">{i + 1}</span>

                        {/* Name + avatar */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-extrabold text-sm shrink-0 ${sc.bg}`}>
                            {e.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-black text-sm truncate">{e.name}</p>
                            <p className="text-xs text-gray-400 font-bold">{sc.dot} {e.final >= 8 ? 'Top student' : e.final < 5 ? 'Needs help' : 'On track'}</p>
                          </div>
                        </div>

                        {/* Engagement */}
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-full border border-black text-xs font-extrabold ${engC.bg} ${engC.text}`}>
                            {e.engagement}
                          </span>
                        </div>

                        {/* Understanding */}
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-full border border-black text-xs font-extrabold ${undC.bg} ${undC.text}`}>
                            {e.understanding}
                          </span>
                        </div>

                        {/* Consistency */}
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-full border border-black text-xs font-extrabold ${conC.bg} ${conC.text}`}>
                            {e.consistency}
                          </span>
                        </div>

                        {/* Final score — larger, bold */}
                        <div className="text-right">
                          <p className={`text-xl font-extrabold ${sc.text}`}>{e.final}</p>
                          <p className="text-xs text-gray-400 font-bold">/ 10</p>
                        </div>

                        {/* View Details */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => setSelectedStudent(e)}
                            className="flex items-center gap-1 px-3 py-1.5 border-2 border-black rounded-full text-xs font-extrabold bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Footer summary */}
              <div className="border-t-2 border-black bg-brand-light px-5 py-3 grid grid-cols-[2rem_1fr_repeat(4,7rem)_6rem] gap-2 text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                <span />
                <span>Class Average</span>
                <span className="text-right text-black">{avgEngagement}</span>
                <span className="text-right text-black">{avgUnderstand}</span>
                <span className="text-right text-black">{avgConsistency}</span>
                <span className={`text-right text-lg font-extrabold ${sc.text}`}>{avgScore}</span>
                <span />
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 px-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Legend:</span>
              <span className="text-xs font-bold text-green-600">🟢 ≥ 8 Top</span>
              <span className="text-xs font-bold text-yellow-600">🟡 5–7 On track</span>
              <span className="text-xs font-bold text-red-500">🔴 &lt; 5 Needs help</span>
            </div>
          </section>

          {/* ── Agent Usage Analytics ── */}
          <section>
            <h3 className="text-lg font-extrabold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-purple-400 rounded-full inline-block" />
              Agent Usage
            </h3>

            {agentUsageLoading && (
              <div className="flex items-center gap-3 py-6 text-gray-400">
                <Loader className="h-5 w-5 animate-spin text-black" />
                <p className="text-sm font-bold">Loading agent data…</p>
              </div>
            )}

            {!agentUsageLoading && agentUsage.length === 0 && (
              <div className="flex items-center gap-3 px-6 py-5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                <Bot className="h-5 w-5 shrink-0" />
                <p className="text-sm font-bold">No agent data yet for this classroom.</p>
              </div>
            )}

            {!agentUsageLoading && agentUsage.length > 0 && (() => {
              const maxQ    = agentUsage[0].query_count;
              const totalQ  = agentUsage.reduce((s, a) => s + a.query_count, 0);
              const mostUsed   = agentUsage[0];
              const leastUsed  = [...agentUsage].sort((a, b) => a.query_count - b.query_count)[0];

              // Label & colour per bot_type; fall back for custom agents
              const agentMeta = (a: AgentUsage): { label: string; accent: string; iconBg: string } => {
                if (a.bot_type === 'homework')    return { label: 'Homework Bot',    accent: 'bg-blue-400',   iconBg: 'bg-blue-100'   };
                if (a.bot_type === 'assignments') return { label: 'Assignments Bot', accent: 'bg-green-400',  iconBg: 'bg-green-100'  };
                if (a.bot_type === 'tests')       return { label: 'Tests Bot',       accent: 'bg-yellow-400', iconBg: 'bg-yellow-100' };
                return                                   { label: a.name,            accent: 'bg-purple-400', iconBg: 'bg-purple-100' };
              };

              return (
                <>
                  {/* Summary pills */}
                  <div className="flex flex-wrap gap-3 mb-5">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-400 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-extrabold text-green-700">
                        Most used: {agentMeta(mostUsed).label} ({mostUsed.query_count} queries)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-300 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-xs font-extrabold text-red-600">
                        {leastUsed.query_count === 0 ? 'Ignored' : 'Least used'}: {agentMeta(leastUsed).label} ({leastUsed.query_count} queries)
                      </span>
                    </div>
                  </div>

                  {/* Agent rows */}
                  <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <ul className="divide-y-2 divide-black">
                      {agentUsage.map((agent, i) => {
                        const meta     = agentMeta(agent);
                        const barPct   = maxQ > 0 ? (agent.query_count / maxQ) * 100 : 0;
                        const share    = totalQ > 0 ? Math.round((agent.query_count / totalQ) * 100) : 0;
                        const isTop    = i === 0 && agent.query_count > 0;
                        const ignored  = agent.query_count === 0;

                        return (
                          <li key={agent.agent_id} className="p-5 hover:bg-brand-light transition-colors">
                            <div className="flex items-center gap-4">
                              {/* Icon */}
                              <div className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${meta.iconBg}`}>
                                <Bot className="h-5 w-5 text-black" />
                              </div>

                              {/* Name + bar */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <p className="font-extrabold text-black text-sm">{meta.label}</p>
                                  {isTop && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 border border-green-400 rounded-full text-xs font-extrabold text-green-700">
                                      <TrendingUp className="h-3 w-3" /> Most Used
                                    </span>
                                  )}
                                  {ignored && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 border border-red-300 rounded-full text-xs font-extrabold text-red-600">
                                      <TrendingDown className="h-3 w-3" /> Not Used
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-gray-100 rounded-full border border-black h-3 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${meta.accent} transition-all duration-700`}
                                      style={{ width: `${barPct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-gray-400 shrink-0 w-10 text-right">{share}%</span>
                                </div>
                              </div>

                              {/* Query count */}
                              <div className="shrink-0 text-right">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <MessageSquare className="h-4 w-4 text-gray-400" />
                                  <p className="text-xl font-extrabold text-black">{agent.query_count}</p>
                                </div>
                                <p className="text-xs text-gray-400 font-bold">queries</p>
                              </div>
                            </div>

                            {/* Optimisation hint for ignored agents */}
                            {ignored && (
                              <p className="mt-3 text-xs font-bold text-red-500 flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                Students haven't used this agent — consider adding more content or promoting it in class.
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {/* Footer total */}
                    <div className="border-t-2 border-black bg-brand-light px-5 py-3 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Total Queries</span>
                      <span className="text-lg font-extrabold text-black">{totalQ}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </section>

          {/* ── Leaderboard ── */}
          <section>
            <h3 className="text-lg font-extrabold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-yellow-400 rounded-full inline-block" />
              🏆 Top Students
            </h3>
            <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <ul className="divide-y-2 divide-black">
                {[...entries]
                  .sort((a, b) => b.final - a.final)
                  .slice(0, 10)
                  .map((e, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                    const sc = scoreColor(e.final);
                    const barPct = entries.length > 0 ? (e.final / 10) * 100 : 0;
                    const podium = i < 3;
                    return (
                      <li
                        key={e.user_id}
                        className={`flex items-center gap-4 px-6 py-4 hover:bg-brand-light transition-colors cursor-pointer ${podium ? 'bg-[#FAFAFA]' : ''}`}
                        onClick={() => setSelectedStudent(e)}
                      >
                        {/* Rank */}
                        <div className={`w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-extrabold text-sm shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${i === 0 ? 'bg-yellow-300' : i === 1 ? 'bg-gray-200' : i === 2 ? 'bg-orange-200' : 'bg-white'}`}>
                          {medal ?? i + 1}
                        </div>

                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-extrabold text-sm shrink-0 ${sc.bg}`}>
                          {e.name[0]?.toUpperCase()}
                        </div>

                        {/* Name + bar */}
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-black text-sm truncate">{e.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-100 rounded-full border border-black h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${sc.bar} transition-all duration-700`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="shrink-0 text-right">
                          <span className={`text-xl font-extrabold ${sc.text}`}>{e.final}</span>
                          <span className="text-xs text-gray-400 font-bold"> / 10</span>
                        </div>

                        {/* Sub-scores */}
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          {([
                            { label: 'E', val: e.engagement },
                            { label: 'U', val: e.understanding },
                            { label: 'C', val: e.consistency },
                          ]).map(({ label, val }) => {
                            const c = scoreColor(val);
                            return (
                              <span key={label} className={`px-2 py-0.5 rounded-full border border-black text-[10px] font-extrabold ${c.bg} ${c.text}`}>
                                {label}{val}
                              </span>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
              </ul>
              {/* Footer */}
              <div className="border-t-2 border-black bg-brand-light px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Class Average</span>
                <span className={`text-lg font-extrabold ${scoreColor(avgScore).text}`}>{avgScore} / 10</span>
              </div>
            </div>
          </section>

          {/* ── Classroom Activity Feed ── */}
          {(() => {
            type FeedEvent = { icon: React.ReactNode; text: string; sub: string; accent: string };
            const feed: FeedEvent[] = [];

            // Top query-er from agent usage total (proxy for "asked most questions")
            const topAgent = agentUsage.length > 0 ? agentUsage.reduce((a, b) => a.query_count > b.query_count ? a : b) : null;
            const totalQueriesAll = agentUsage.reduce((s, a) => s + a.query_count, 0);

            if (totalQueriesAll > 0) {
              feed.push({
                icon: <MessageSquare className="h-4 w-4 text-blue-600" />,
                text: `${totalQueriesAll} question${totalQueriesAll !== 1 ? 's' : ''} asked across all agents`,
                sub: topAgent ? `Most via ${topAgent.name} (${topAgent.query_count} queries)` : 'Across all classroom agents',
                accent: 'bg-blue-50 border-blue-300',
              });
            }

            // Students who improved (score >= 7 — "on track or better")
            const improved = entries.filter(e => e.final >= 7 && e.understanding >= 7);
            if (improved.length > 0) {
              improved.slice(0, 2).forEach(e => {
                feed.push({
                  icon: <TrendingUp className="h-4 w-4 text-green-600" />,
                  text: `${e.name} is performing well`,
                  sub: `Score ${e.final}/10 · Understanding ${e.understanding}/10`,
                  accent: 'bg-green-50 border-green-300',
                });
              });
            }

            // Students who completed all topics (high consistency + understanding)
            const allDone = entries.filter(e => e.consistency >= 8 && e.understanding >= 8);
            allDone.slice(0, 2).forEach(e => {
              feed.push({
                icon: <Star className="h-4 w-4 text-yellow-500" />,
                text: `${e.name} mastered all studied topics`,
                sub: `Consistency ${e.consistency}/10 · Understanding ${e.understanding}/10`,
                accent: 'bg-yellow-50 border-yellow-300',
              });
            });

            // Struggling students alert
            if (needsAttention.length > 0) {
              feed.push({
                icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
                text: `${needsAttention.length} student${needsAttention.length !== 1 ? 's' : ''} need${needsAttention.length === 1 ? 's' : ''} attention`,
                sub: needsAttention.slice(0, 3).map(e => e.name.split(' ')[0]).join(', ') + (needsAttention.length > 3 ? ` +${needsAttention.length - 3} more` : ''),
                accent: 'bg-red-50 border-red-300',
              });
            }

            // Weak topics alert
            if (weakTopics.length > 0) {
              feed.push({
                icon: <Flame className="h-4 w-4 text-orange-500" />,
                text: `${weakTopics.length} weak topic${weakTopics.length !== 1 ? 's' : ''} detected class-wide`,
                sub: weakTopics.slice(0, 3).map(t => t.topic).join(', ') + (weakTopics.length > 3 ? ` +${weakTopics.length - 3} more` : ''),
                accent: 'bg-orange-50 border-orange-300',
              });
            }

            if (feed.length === 0) return null;

            return (
              <section>
                <h3 className="text-lg font-extrabold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-6 bg-green-400 rounded-full inline-block" />
                  Recent Activity
                  <span className="ml-1 flex items-center gap-1 px-2.5 py-0.5 bg-green-100 border-2 border-green-400 rounded-full text-green-700 text-xs font-extrabold">
                    <Clock className="h-3 w-3" /> Live
                  </span>
                </h3>
                <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden divide-y-2 divide-black">
                  {feed.map((event, i) => (
                    <div key={i} className={`flex items-start gap-4 px-6 py-4 ${i === 0 ? '' : ''}`}>
                      <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${event.accent.split(' ')[0]}`}>
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-black">{event.text}</p>
                        <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{event.sub}</p>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-bold ${event.accent}`}>
                        Today
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}
        </>
      )}

      {/* Student detail drawer */}
      {selectedStudent && (
        <StudentDrawer
          student={selectedStudent}
          classroomFirestoreId={classroom.id}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {/* Share Agent dialog */}
      {shareDialogOpen && (
        <ShareAgentDialog
          visibleAgentIds={classroom.visibleAgentIds ?? []}
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </div>
  );
}

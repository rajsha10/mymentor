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
    <div className="flex flex-col gap-2 p-5 rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all group">
      <div className={`w-10 h-10 rounded-xl ${accent} border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all`}>
        {icon}
      </div>
      <div className="mt-1">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">{label}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-2xl font-black text-black leading-none">
            {value}
          </p>
          {dot && <span className="text-lg">{dot}</span>}
        </div>
      </div>
    </div>
  );
}

type MiniBarProps = { label: string; value: number; barColor: string };
function MiniBar({ label, value, barColor }: MiniBarProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black text-black">{value}/10</span>
      </div>
      <div className="bg-gray-50 rounded-lg border-2 border-black h-2.5 overflow-hidden shadow-[1px_1px_0px_0px_rgba(0,0,0,0.05)]">
        <div
          className={`h-full rounded-r-sm ${barColor} transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(100, (value / 10) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// Derive human-readable weakness reasons from scores
function weakReasons(e: StudentEntry): string[] {
  const reasons: string[] = [];
  if (e.consistency < 5)   reasons.push('Limited consistency — irregular study patterns detected');
  if (e.understanding < 5) reasons.push('Conceptual gaps — struggling with fundamental topics');
  if (e.engagement < 5)    reasons.push('Low engagement — minimal interaction with course materials');
  if (e.consistency >= 5 && e.consistency < 7) reasons.push('Moderate consistency — could be more regular');
  if (e.understanding >= 5 && e.understanding < 7) reasons.push('Emerging understanding — needs more reinforced practice');
  if (e.engagement >= 5 && e.engagement < 7)    reasons.push('Steady engagement — encourage more active participation');
  return reasons.length ? reasons : ['Performance is within expected range'];
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-[60] bg-white border-l-4 border-black shadow-[-8px_0px_0px_0px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="relative px-6 py-8 border-b-2 border-black bg-[#FDFDFD] shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl border-4 border-black flex items-center justify-center font-black text-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${sc.bg}`}>
              {student.name[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-black text-black text-2xl leading-tight mb-1">{student.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border-2 border-black text-[10px] font-black ${sc.bg} ${sc.text} shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`}>
                  {sc.dot} SCORE: {student.final}/10
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto bg-white">
          {/* Metrics section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-3 bg-black rounded-full" />
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Core Metrics</p>
            </div>
            <div className="grid grid-cols-1 gap-5">
              {metrics.map(m => {
                const val = student[m.key] as number;
                const mc  = scoreColor(val);
                return (
                  <div key={m.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[10px] font-black text-black uppercase tracking-wider">
                        {m.icon} {m.label}
                      </span>
                      <span className={`text-[10px] font-black ${mc.text} bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md`}>
                        {val} / 10
                      </span>
                    </div>
                    <div className="w-full bg-gray-50 rounded-lg border-2 border-black h-3 overflow-hidden shadow-[1px_1px_0px_0px_rgba(0,0,0,0.05)]">
                      <div
                        className={`h-full rounded-r-sm ${m.bar} transition-all duration-1000 ease-out`}
                        style={{ width: `${(val / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* AI Diagnosis */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-3 bg-brand-coral rounded-full" />
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">AI Pedagogical Diagnosis</p>
            </div>
            <div className="space-y-3">
              {reasons.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl border-2 border-black bg-[#FDFDFD] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="w-7 h-7 rounded-lg bg-brand-coral/10 border-2 border-black flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-brand-coral" />
                  </div>
                  <p className="text-xs font-black text-black leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Recommendations */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-3 bg-blue-500 rounded-full" />
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Teacher Recommendations</p>
            </div>
            <ul className="space-y-3">
              {[
                { condition: student.consistency < 7, text: 'Schedule a brief check-in to discuss study routines' },
                { condition: student.understanding < 7, text: 'Deploy targeted review assignments for fundamental concepts' },
                { condition: student.engagement < 7, text: 'Promote active interaction with the Classroom AI Agent' }
              ].filter(rec => rec.condition).map((rec, i) => (
                <li key={i} className="flex items-center gap-3 group">
                  <div className="w-5 h-5 border-2 border-black rounded-lg flex items-center justify-center text-[9px] font-black group-hover:bg-black group-hover:text-white transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    {i + 1}
                  </div>
                  <p className="text-[11px] font-black text-gray-600 group-hover:text-black transition-colors">{rec.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Action buttons — sticky footer */}
        <div className="px-6 py-6 border-t-2 border-black bg-[#FDFDFD] shrink-0 grid grid-cols-2 gap-3">
          <button
            onClick={() => { onClose(); navigate(`/classroom/${classroomFirestoreId}`); }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-black text-white font-black text-[10px] uppercase tracking-widest border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(255,107,87,1)] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(255,107,87,1)] active:translate-y-0 active:shadow-none transition-all"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Assign Tasks
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
          >
            <Eye className="h-3.5 w-3.5" />
            View Profile
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
  if (col !== sortKey) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />;
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b-2 border-black bg-brand-light">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Share2 className="h-5 w-5 text-black" />
              </div>
              <div>
                <h3 className="font-black text-black text-lg leading-tight">Agent Distribution</h3>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Share intelligence with your students</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-3 max-h-[50vh] overflow-y-auto bg-[#FDFDFD]">
            {loading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader className="h-6 w-6 animate-spin text-black" />
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Syncing active agents…</p>
              </div>
            )}
            {!loading && agents.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 px-6 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                <Bot className="h-8 w-8 text-gray-200" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-relaxed">No agents authorized yet.</p>
              </div>
            )}
            {!loading && agents.map(agent => (
              <div
                key={agent.id}
                className="group flex items-center gap-3 p-4 rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                  <Bot className="h-5 w-5 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-black text-sm truncate">{agent.name}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate mt-0.5">{agent.description || 'Custom Intelligence Agent'}</p>
                </div>
                <button
                  onClick={() => copyLink(agent.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 border-2 border-black rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] shrink-0 ${
                    copied === agent.id
                      ? 'bg-green-400 text-black translate-x-0.5 translate-y-0.5 shadow-none'
                      : 'bg-white text-black hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                  }`}
                >
                  {copied === agent.id ? (
                    <><Check className="h-3 w-3" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Link</>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t-2 border-black bg-brand-light">
            <div className="flex items-start gap-2 bg-white/50 border-2 border-black border-dashed rounded-xl p-3">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
                Links allow students to interact with the agent's knowledge base.
              </p>
            </div>
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
    <div className="p-6 sm:p-8 space-y-10 bg-white">
      {/* ── Enhanced Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b-4 border-black pb-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-brand-coral rounded-2xl border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-[-3deg]">
            <BarChart2 className="h-7 w-7 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-black leading-none tracking-tight">Intelligence Dashboard</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] bg-gray-50 px-2 py-0.5 border-2 border-black rounded-lg">
                Faculty Analytics Suite
              </span>
              <div className="h-1 w-1 bg-gray-300 rounded-full" />
              <p className="text-[10px] font-black text-black uppercase tracking-widest">{classroom.name}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Cohort</span>
            <span className="text-lg font-black text-black">{totalStudents} Students</span>
          </div>
          <button
            onClick={() => onNavigateTab?.('agent')}
            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white border-2 border-black rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-[3px_3px_0px_0px_rgba(255,107,87,1)] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(255,107,87,1)] active:translate-y-0 active:shadow-none transition-all"
          >
            <Share2 className="h-3.5 w-3.5" />
            Distribute Agents
          </button>
        </div>
      </div>

      {/* ── Optimized Quick Actions ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 bg-brand-coral rounded-full" />
          <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Operational Shortcuts</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Construct Assessment', icon: <FlaskConical className="h-4 w-4" />, bg: 'bg-[#FFF0EE]', accent: 'group-hover:bg-brand-coral', tab: 'tests' },
            { label: 'Repository Upload', icon: <Upload className="h-4 w-4" />, bg: 'bg-blue-50', accent: 'group-hover:bg-blue-400', tab: 'materials' },
            { label: 'Agent Hub', icon: <Bot className="h-4 w-4" />, bg: 'bg-purple-50', accent: 'group-hover:bg-purple-400', tab: 'agent' },
            { label: 'Intervention List', icon: <Users className="h-4 w-4" />, bg: 'bg-red-50', accent: 'group-hover:bg-red-400', scroll: 'needs-attention-section', badge: needsAttention.length }
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => {
                if (action.tab) onNavigateTab?.(action.tab);
                if (action.scroll) document.getElementById(action.scroll)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group relative flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${action.bg} border-2 border-black flex items-center justify-center ${action.accent} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all relative`}>
                {action.icon}
                {action.badge !== undefined && action.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-brand-coral border-2 border-black rounded-lg text-[9px] font-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                    {action.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-black text-black uppercase tracking-widest text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Loading & Empty States ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border-2 border-black border-dashed rounded-3xl bg-gray-50/30">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-black rounded-full border-t-brand-coral animate-spin" />
            <Brain className="absolute inset-0 m-auto h-5 w-5 text-black" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400">Aggregating pedagogical data streams…</p>
        </div>
      )}

      {/* (Other states: error, empty students, etc. remain with slightly updated styles) */}
      {!loading && totalStudents > 0 && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border-2 border-black border-dashed rounded-3xl bg-gray-50/50 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Activity className="h-8 w-8 text-gray-300" />
          </div>
          <div>
            <p className="text-lg font-black text-black uppercase tracking-tight">Zero Activity Threshold</p>
            <p className="text-xs font-bold text-gray-400 mt-1 max-w-md">Analytics require student interaction with AI Agents. Current enrollment: {totalStudents} students.</p>
          </div>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          {/* ── Key Performance Indicators ── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-black rounded-full" />
              <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Key Performance Indicators</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard
                label="Average Proficiency"
                value={avgScore}
                dot={sc.dot}
                icon={<TrendingUp className="h-5 w-5 text-black" />}
                accent="bg-brand-coral"
              />
              <StatCard
                label="Class Valedictorian"
                value={topPerformer ? topPerformer.name.split(' ')[0] : '—'}
                dot={topPerformer ? `(${topPerformer.final})` as any : undefined}
                icon={<Star className="h-5 w-5 text-black" />}
                accent="bg-yellow-300"
              />
              <StatCard
                label="Enrollment Volume"
                value={totalStudents}
                icon={<Users className="h-5 w-5 text-black" />}
                accent="bg-blue-200"
              />
              <StatCard
                label="Priority Interventions"
                value={needsAttention.length}
                dot={needsAttention.length > 0 ? '🔴' : '🟢'}
                icon={<AlertTriangle className="h-5 w-5 text-black" />}
                accent={needsAttention.length > 0 ? 'bg-red-200' : 'bg-green-200'}
              />
            </div>
          </section>

          {/* ── Class Averages Visualization ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-blue-500 rounded-full" />
                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Skill Distribution</h3>
              </div>
              <div className="bg-[#FDFDFD] border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                <MiniBar label="Student Engagement" value={avgEngagement}  barColor="bg-brand-coral" />
                <MiniBar label="Conceptual Understanding" value={avgUnderstand}  barColor="bg-blue-400" />
                <MiniBar label="Study Consistency"  value={avgConsistency} barColor="bg-green-400" />
                <div className="pt-3 border-t-2 border-black/5">
                  <MiniBar label="Overall Proficiency" value={avgScore}       barColor={sc.bar} />
                </div>
              </div>
            </div>

            {/* ── Topic-Level Insights ── */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-purple-500 rounded-full" />
                  <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Conceptual Friction Points</h3>
                </div>
                {!topicsLoading && weakTopics.length > 0 && (
                  <span className="text-[8px] font-black text-blue-600 bg-blue-50 border-2 border-black px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase tracking-widest">
                    {weakTopics.length} Areas Detected
                  </span>
                )}
              </div>

              {topicsLoading ? (
                <div className="h-[250px] flex items-center justify-center border-2 border-black border-dashed rounded-3xl bg-gray-50/30">
                  <Loader className="h-6 w-6 animate-spin text-black" />
                </div>
              ) : weakTopics.length === 0 ? (
                <div className="h-[250px] flex flex-col items-center justify-center gap-3 border-2 border-black border-dashed rounded-3xl bg-gray-50/50">
                  <Target className="h-8 w-8 text-gray-200" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">No significant friction points detected</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {weakTopics.map((t, i) => {
                    const severe = t.struggling_pct >= 60;
                    const moderate = t.struggling_pct >= 35;
                    const severityColor = severe ? 'bg-red-400' : moderate ? 'bg-yellow-300' : 'bg-blue-300';
                    const icon = severe ? <Flame className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />;

                    return (
                      <div
                        key={t.topic}
                        className="group relative bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden"
                      >
                        <div className={`absolute top-0 right-0 px-3 py-1 border-l-2 border-b-2 border-black text-[8px] font-black uppercase tracking-widest ${severe ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                          {severe ? 'CRITICAL' : 'REview Required'}
                        </div>
                        
                        <div className="flex items-center gap-3 mb-3 mt-1">
                          <div className={`w-7 h-7 rounded-lg border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${severityColor}`}>
                            {icon}
                          </div>
                          <p className="font-black text-black text-sm truncate uppercase tracking-tight">{t.topic}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
                            <span>Success Rate</span>
                            <span className={severe ? 'text-red-600' : 'text-black'}>{100 - t.struggling_pct}%</span>
                          </div>
                          <div className="h-2 bg-gray-50 rounded-full border-2 border-black overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-r-sm ${severityColor} transition-all duration-1000`}
                              style={{ width: `${100 - t.struggling_pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-1">
                          {t.struggling_user_ids.slice(0, 3).map(uid => {
                            const student = entries.find(e => e.user_id === uid);
                            return student ? (
                              <button
                                key={uid}
                                onClick={() => setSelectedStudent(student)}
                                className="px-2 py-0.5 bg-gray-50 border-2 border-black rounded-lg text-[8px] font-black uppercase tracking-tighter hover:bg-black hover:text-white transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                              >
                                {student.name.split(' ')[0]}
                              </button>
                            ) : null;
                          })}
                          {t.struggling_user_ids.length > 3 && (
                            <span className="px-1.5 py-0.5 text-[8px] font-black text-gray-400">+{t.struggling_user_ids.length - 3}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Student Performance Table Redesign ── */}
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-yellow-300 rounded-full" />
                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Individual Cohort Performance</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 border-2 border-black p-1 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                {(['all', 'top', 'weak'] as FilterMode[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                      filter === f
                        ? 'bg-black text-white'
                        : 'bg-transparent text-gray-400 hover:text-black'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'top' ? 'Elite' : 'Intervention'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#FDFDFD] border-b-4 border-black">
                      <th className="px-4 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest w-12">#</th>
                      <th className="px-4 py-4 text-left">
                        <button onClick={() => handleSort('name')} className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest group">
                          Identity <SortIcon col="name" sortKey={sortKey} dir={sortDir} />
                        </button>
                      </th>
                      {([
                        { key: 'engagement',    label: 'Eng' },
                        { key: 'understanding', label: 'Und' },
                        { key: 'consistency',   label: 'Con' },
                        { key: 'final',         label: 'Proficiency' },
                      ] as { key: SortKey; label: string }[]).map((col) => (
                        <th key={col.key} className="px-4 py-4 text-right">
                          <button onClick={() => handleSort(col.key)} className="flex items-center justify-end gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest w-full group">
                            {col.label} <SortIcon col={col.key} sortKey={sortKey} dir={sortDir} />
                          </button>
                        </th>
                      ))}
                      <th className="px-4 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/5">
                    {tableRows.map((e, i) => {
                      const sc = scoreColor(e.final);
                      return (
                        <tr key={e.user_id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-4 py-4 text-[10px] font-black text-gray-300 group-hover:text-black transition-colors">{i + 1}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center font-black text-xs shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] ${sc.bg}`}>
                                {e.name[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-black text-black text-xs uppercase tracking-tight">{e.name}</p>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{e.final >= 8 ? 'Mastery' : e.final < 5 ? 'At Risk' : 'Standard'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-black text-xs text-black">{e.engagement}</td>
                          <td className="px-4 py-4 text-right font-black text-xs text-black">{e.understanding}</td>
                          <td className="px-4 py-4 text-right font-black text-xs text-black">{e.consistency}</td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className={`text-lg font-black ${sc.text}`}>{e.final}</span>
                              <div className={`w-10 h-1 rounded-full border border-black/10 mt-1 overflow-hidden ${sc.bg}`}>
                                <div className={`h-full ${sc.bar}`} style={{ width: `${e.final * 10}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => setSelectedStudent(e)}
                              className="px-3 py-1.5 bg-white border-2 border-black rounded-lg text-[8px] font-black uppercase tracking-widest shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
                            >
                              Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── Visual Leaderboard ── */}
          <section className="bg-black rounded-3xl p-8 text-white shadow-[8px_8px_0px_0px_rgba(255,107,87,1)]">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-yellow-300 rounded-xl border-2 border-white flex items-center justify-center rotate-[-6deg] shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]">
                <Star className="h-5 w-5 text-black" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Academic Honor Roll</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...entries]
                .sort((a, b) => b.final - a.final)
                .slice(0, 6)
                .map((e, i) => {
                  const sc = scoreColor(e.final);
                  return (
                    <div
                      key={e.user_id}
                      onClick={() => setSelectedStudent(e)}
                      className="group flex items-center gap-4 p-5 rounded-2xl bg-white/5 border-2 border-white/10 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-xl border-2 border-white flex items-center justify-center font-black text-lg shrink-0 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] ${i === 0 ? 'bg-yellow-300 text-black' : 'bg-white/10 text-white'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-sm truncate uppercase tracking-tight">{e.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-coral" style={{ width: `${e.final * 10}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-brand-coral shrink-0">{e.final}/10</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </>
      )}

      {/* Drawer & Dialogs stay mostly the same but with updated styles in their definitions */}
      {selectedStudent && (
        <StudentDrawer
          student={selectedStudent}
          classroomFirestoreId={classroom.id}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {shareDialogOpen && (
        <ShareAgentDialog
          visibleAgentIds={classroom.visibleAgentIds ?? []}
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </div>
  );
}


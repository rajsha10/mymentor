import { useState, useEffect } from 'react';
import { listAgents } from '../../../services/backendApi';
import {
  teacherGenerateAssignment,
  type AssignmentType, type AssignmentQuestion, type TeacherAssignmentResult,
} from '../../../services/backendApi';
import { BookOpen, Bot, ChevronDown, CheckSquare, Square, Loader, Calendar, AlertCircle } from 'lucide-react';

interface Agent { id: string; name: string; description: string; }

const TYPE_LABELS: Record<AssignmentType, { label: string; desc: string }> = {
  descriptive: { label: 'Descriptive', desc: 'Multi-paragraph written answers' },
  long_form:   { label: 'Long Form Essay', desc: 'Structured essay-style responses' },
  project:     { label: 'Project Task', desc: 'Design, build, or investigate tasks' },
};

const TYPE_MARKS: Record<AssignmentType, number> = {
  descriptive: 10,
  long_form: 20,
  project: 30,
};

function stableClassId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i);
  return Math.abs(h) % 2_147_483_647 || 1;
}

function QuestionPreview({ q, index }: { q: AssignmentQuestion; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className={`border-2 border-black rounded-3xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${open ? 'bg-white' : 'bg-white hover:bg-gray-50'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black text-white border-2 border-black rounded-lg flex items-center justify-center font-black text-[10px] shadow-[1.5px_1.5px_0px_0px_rgba(255,107,87,1)]">
            Q{index + 1}
          </div>
          <div>
            <p className="text-[10px] font-black text-black uppercase tracking-widest">{TYPE_LABELS[q.type]?.label || q.type}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{q.marks} MARKS AVAILABLE</span>
            </div>
          </div>
        </div>
        <div className={`w-6 h-6 border-2 border-black rounded-md flex items-center justify-center transition-transform duration-300 ${open ? 'rotate-180 bg-black text-white' : 'bg-white text-black'}`}>
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </button>
      {open && (
        <div className="px-6 pb-6 border-t-2 border-black/5 animate-in slide-in-from-top-2 duration-200">
          <p className="text-base font-black text-black pt-4 leading-relaxed uppercase tracking-tight">{q.question}</p>
          {q.guidance && (
            <div className="mt-4 bg-[#FDFDFD] border-2 border-black border-dashed rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3 bg-brand-coral rounded-full" />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pedagogical Guidance</p>
              </div>
              <p className="text-xs font-bold text-gray-600 leading-relaxed italic">"{q.guidance}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeacherAssignmentGenerator({
  firestoreClassroomId,
}: {
  firestoreClassroomId: string;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [topic, setTopic] = useState('');
  const [assignmentTypes, setAssignmentTypes] = useState<AssignmentType[]>(['descriptive']);
  const [count, setCount] = useState(3);
  const [deadline, setDeadline] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TeacherAssignmentResult | null>(null);

  useEffect(() => {
    listAgents()
      .then(d => setAgents(d.map(a => ({ id: a.id, name: a.name, description: a.description }))))
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, []);

  const toggleType = (t: AssignmentType) =>
    setAssignmentTypes(prev =>
      prev.includes(t)
        ? prev.length === 1 ? prev : prev.filter(x => x !== t)
        : [...prev, t]
    );

  const handleGenerate = async () => {
    if (!selectedAgentId) { setError('Please select a knowledge source (agent).'); return; }
    if (!topic.trim()) { setError('Topic specification is required.'); return; }
    if (!deadline) { setError('Submission deadline must be established.'); return; }

    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await teacherGenerateAssignment({
        agent_id: selectedAgentId,
        class_id: stableClassId(firestoreClassroomId),
        topic: topic.trim(),
        assignment_types: assignmentTypes,
        count,
        deadline: new Date(deadline).toISOString(),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Synthesis protocol failure. Verify knowledge repository status.');
    } finally {
      setLoading(false);
    }
  };

  // Min deadline: now + 1 hour
  const minDeadline = new Date(Date.now() + 3600_000).toISOString().slice(0, 16);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-10 bg-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b-4 border-black pb-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-black rounded-2xl border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] rotate-[-3deg]">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-black leading-none tracking-tight">Assignment Lab</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] bg-gray-50 px-2 py-0.5 border-2 border-black rounded-lg">
                Neural Task Synthesis
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Config Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#FDFDFD] border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 bg-brand-coral rounded-full" />
              <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Curriculum Settings</h3>
            </div>

            {/* Agent selector */}
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Knowledge Source (Agent)</label>
              {agentsLoading ? (
                <div className="flex items-center gap-2 px-4 py-2.5 border-2 border-black rounded-xl bg-gray-50/50">
                  <Loader className="h-3.5 w-3.5 animate-spin text-black" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing Agents…</span>
                </div>
              ) : agents.length === 0 ? (
                <div className="p-4 border-2 border-black border-dashed rounded-xl text-center">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">No agents detected.</p>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    className="w-full appearance-none border-4 border-black rounded-xl px-4 py-2.5 pr-10 font-black text-xs bg-white focus:outline-none focus:border-brand-coral transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)]"
                  >
                    <option value="">— SELECT AGENT —</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-3 h-4 w-4 pointer-events-none text-black" />
                </div>
              )}
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Core Topic Focus</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. MOLECULAR BIOLOGY"
                className="w-full border-4 border-black rounded-xl px-4 py-2.5 font-black text-xs uppercase placeholder-gray-200 focus:outline-none focus:border-brand-coral transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            {/* Assignment types */}
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Task Modalities</label>
              <div className="space-y-2">
                {(Object.keys(TYPE_LABELS) as AssignmentType[]).map(t => {
                  const selected = assignmentTypes.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`w-full group flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                          : 'bg-white border-black/10 text-gray-400 hover:border-black hover:text-black'
                      }`}
                    >
                      {selected ? <CheckSquare className="h-3.5 w-3.5 shrink-0 text-brand-coral" /> : <Square className="h-3.5 w-3.5 shrink-0" />}
                      <div className="flex-1">
                        <p className="font-black text-[9px] uppercase tracking-widest">{TYPE_LABELS[t].label}</p>
                        <p className={`text-[8px] font-bold mt-0.5 ${selected ? 'text-gray-400' : 'text-gray-300'}`}>{TYPE_MARKS[t]} MARKS EACH</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Count & Deadline */}
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Item Count</label>
                  <span className="text-lg font-black text-brand-coral">{count}</span>
                </div>
                <input
                  type="range" min={1} max={10} value={count}
                  onChange={e => setCount(Number(e.target.value))}
                  className="w-full accent-black cursor-pointer h-1.5"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Submission Deadline</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    min={minDeadline}
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full border-4 border-black rounded-xl px-4 py-2.5 font-black text-[10px] focus:outline-none focus:border-brand-coral transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)]"
                  />
                  <Calendar className="absolute right-4 top-3 h-3.5 w-3.5 text-black pointer-events-none" />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border-2 border-black p-3 rounded-lg text-red-600 animate-in fade-in duration-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3.5 bg-brand-coral text-black font-black uppercase tracking-[0.3em] text-[9px] rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Loader className="h-3.5 w-3.5 animate-spin" /> SYNTHESIZING…</>
              ) : (
                <><Bot className="h-4 w-4" /> GENERATE ASSIGNMENTS</>
              )}
            </button>
          </div>
        </div>

        {/* Results Main Area */}
        <div className="lg:col-span-7 space-y-8">
          {!result && !loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center border-4 border-black border-dashed rounded-3xl bg-gray-50/30 p-8">
              <div className="w-16 h-16 bg-white border-4 border-black rounded-2xl flex items-center justify-center mb-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <BookOpen className="h-8 w-8 text-gray-200" />
              </div>
              <h3 className="text-xl font-black text-black uppercase tracking-tight">System Idle</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 max-w-sm leading-relaxed">
                Configure task parameters on the left to synthesize new graded assignments from your agent's neural repository.
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center gap-6 border-4 border-black border-dashed rounded-3xl bg-gray-50/50 p-8">
              <div className="relative">
                <div className="w-20 h-20 border-[6px] border-black rounded-full border-t-brand-coral animate-spin" />
                <Bot className="absolute inset-0 m-auto h-8 w-8 text-black" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-lg font-black text-black uppercase tracking-tight">Synthesis in Progress</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Mapping curricular requirements…</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between bg-black rounded-3xl p-6 text-white shadow-[6px_6px_0px_0px_rgba(255,107,87,1)]">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">{result.topic}</h3>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">
                    Deadline Protocol: {new Date(result.deadline).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border border-white/20 bg-brand-coral/10 text-brand-coral">
                      {result.questions.reduce((s, q) => s + q.marks, 0)} TOTAL MARKS
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 bg-green-400 rounded-xl border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">
                    <CheckSquare className="h-5 w-5 text-black" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-green-400">Published</span>
                </div>
              </div>
              
              <div className="space-y-5">
                {result.questions.map((q, i) => (
                  <QuestionPreview key={i} q={q} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

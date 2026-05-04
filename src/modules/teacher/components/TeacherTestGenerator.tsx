import { useState, useEffect } from 'react';
import { listAgents } from '../../../services/backendApi';
import {
  teacherGenerateTest,
  type Difficulty,
  type QuestionType,
  type TestQuestion,
  type TeacherTestResult,
} from '../../../services/backendApi';
import { Bot, Loader, FlaskConical, ChevronDown, CheckSquare, Square } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
}

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Multiple Choice (MCQ)',
  short_answer: 'Short Answer',
  conceptual: 'Conceptual',
};

const diffColors: Record<Difficulty, string> = {
  Easy: 'bg-green-50 border-green-400 text-green-800',
  Medium: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  Hard: 'bg-red-50 border-red-400 text-red-800',
};

function QuestionCard({ q, index }: { q: TestQuestion; index: number }) {
  return (
    <div className="group border-2 border-black rounded-[2rem] p-8 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-[10px] font-black uppercase bg-black text-white px-3 py-1.5 rounded-xl shrink-0 shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
          QUESTION {index + 1}
        </span>
        <span className="text-[10px] font-black uppercase border-2 border-black bg-gray-50 px-3 py-1.5 rounded-xl text-black shrink-0">
          {QUESTION_TYPE_LABELS[q.type] ?? q.type}
        </span>
        <div className="ml-auto h-0.5 flex-1 bg-black/5 rounded-full" />
      </div>
      
      <p className="text-lg font-black text-black mb-6 leading-relaxed uppercase tracking-tight">{q.question}</p>
      
      {Array.isArray(q.options) && q.options.length > 0 && (
        <div className="grid grid-cols-1 gap-3 mb-6">
          {q.options.map((opt, i) => {
            const isCorrect = opt.startsWith(q.answer + ')');
            return (
              <div
                key={i}
                className={`text-sm px-5 py-4 rounded-2xl border-2 font-black transition-all ${
                  isCorrect
                    ? 'bg-green-50 border-black text-green-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-gray-50/50 border-black/10 text-gray-500 hover:border-black hover:bg-white'
                }`}
              >
                {opt}
              </div>
            );
          })}
        </div>
      )}
      {!q.options && (
        <div className="bg-gray-50 border-2 border-black border-dashed rounded-2xl px-6 py-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pedagogical Solution</p>
          <p className="text-sm font-bold text-black leading-relaxed">{q.answer}</p>
        </div>
      )}
    </div>
  );
}

// Derive a stable positive integer from any string (join code or firestore id)
function stableClassId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i);
  return Math.abs(h) % 2_147_483_647 || 1;
}

export default function TeacherTestGenerator({
  classroomId,
  firestoreClassroomId,
}: {
  classroomId: string;        // short join code (used for agent lookup)
  firestoreClassroomId: string; // firestore doc ID — used to derive stable class_id
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['mcq']);
  const [count, setCount] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TeacherTestResult | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    listAgents()
      .then(data => setAgents(data.map(a => ({ id: a.id, name: a.name, description: a.description }))))
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, []);

  const toggleType = (t: QuestionType) => {
    setQuestionTypes(prev =>
      prev.includes(t)
        ? prev.length === 1 ? prev  // keep at least one
          : prev.filter(x => x !== t)
        : [...prev, t]
    );
  };

  const handleGenerate = async () => {
    if (!selectedAgentId) { setError('Please specify an agent to source knowledge.'); return; }
    if (!topic.trim()) { setError('Topic specification is required.'); return; }

    setError('');
    setResult(null);
    setSaved(false);
    setLoading(true);

    try {
      const data = await teacherGenerateTest({
        agent_id: selectedAgentId,
        class_id: stableClassId(firestoreClassroomId),
        topic: topic.trim(),
        difficulty,
        question_types: questionTypes,
        count,
      });
      setResult(data);
      setSaved(true); // backend already saved it
    } catch (err: any) {
      setError(err.message || 'Generation protocol failed. Please verify agent availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 sm:p-12 max-w-5xl mx-auto space-y-12 bg-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-4 border-black pb-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-black rounded-[1.5rem] border-4 border-black flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] rotate-[-3deg]">
            <FlaskConical className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-black leading-none tracking-tight">Assessment Engine</h2>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] bg-gray-50 px-3 py-1 border-2 border-black rounded-lg">
                Automated Question Synthesis
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Config Sidebar */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-[#FDFDFD] border-4 border-black rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-5 bg-brand-coral rounded-full" />
              <h3 className="text-xs font-black text-black uppercase tracking-[0.3em]">Generation Parameters</h3>
            </div>

            {/* Agent selector */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Knowledge Source (Agent)</label>
              {agentsLoading ? (
                <div className="flex items-center gap-3 px-5 py-4 border-2 border-black rounded-2xl bg-gray-50/50">
                  <Loader className="h-4 w-4 animate-spin text-black" />
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Syncing Agents…</span>
                </div>
              ) : agents.length === 0 ? (
                <div className="p-5 border-2 border-black border-dashed rounded-2xl text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No agents detected.</p>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    className="w-full appearance-none border-4 border-black rounded-2xl px-6 py-4 pr-12 font-black text-sm bg-white focus:outline-none focus:border-brand-coral transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]"
                  >
                    <option value="">— SELECT AGENT —</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-5 h-5 w-5 pointer-events-none text-black" />
                </div>
              )}
            </div>

            {/* Topic */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Core Topic Focus</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. QUANTUM MECHANICS"
                className="w-full border-4 border-black rounded-2xl px-6 py-4 font-black text-sm uppercase placeholder-gray-200 focus:outline-none focus:border-brand-coral transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Complexity Level</label>
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                      difficulty === d
                        ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] -translate-y-0.5'
                        : 'bg-white border-black/10 text-gray-400 hover:border-black hover:text-black'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Types */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Assessment Formats</label>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(t => {
                  const selected = questionTypes.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`flex items-center gap-4 px-5 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest text-left transition-all ${
                        selected
                          ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                          : 'bg-white border-black/10 text-gray-400 hover:border-black hover:text-black'
                      }`}
                    >
                      {selected ? <CheckSquare className="h-4 w-4 shrink-0 text-brand-coral" /> : <Square className="h-4 w-4 shrink-0" />}
                      {QUESTION_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Count */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Item Count</label>
                <span className="text-xl font-black text-brand-coral">{count}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full accent-black cursor-pointer"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border-2 border-black p-4 rounded-xl text-red-600 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-5 bg-brand-coral text-black font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <><Loader className="h-4 w-4 animate-spin" /> SYNTHESIZING…</>
              ) : (
                <><Bot className="h-5 w-5" /> GENERATE ASSESSMENT</>
              )}
            </button>
          </div>
        </div>

        {/* Results Main Area */}
        <div className="lg:col-span-7 space-y-10">
          {!result && !loading && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center border-4 border-black border-dashed rounded-[3rem] bg-gray-50/30 p-12">
              <div className="w-20 h-20 bg-white border-4 border-black rounded-[2rem] flex items-center justify-center mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <FlaskConical className="h-10 w-10 text-gray-200" />
              </div>
              <h3 className="text-2xl font-black text-black uppercase tracking-tight">System Idle</h3>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-3 max-w-sm leading-relaxed">
                Configure generation parameters on the left to synthesize a new assessment from your agent's knowledge base.
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center gap-8 border-4 border-black border-dashed rounded-[3rem] bg-gray-50/50 p-12">
              <div className="relative">
                <div className="w-24 h-24 border-[6px] border-black rounded-full border-t-brand-coral animate-spin" />
                <Bot className="absolute inset-0 m-auto h-10 w-10 text-black" />
              </div>
              <div className="space-y-2 text-center">
                <p className="text-xl font-black text-black uppercase tracking-tight">Synthesis in Progress</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Scanning knowledge repository…</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between bg-black rounded-[2rem] p-8 text-white shadow-[8px_8px_0px_0px_rgba(255,107,87,1)]">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">{result.topic}</h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-[9px] font-black uppercase px-3 py-1 rounded-lg border border-white/20 bg-white/5">
                      {result.difficulty} COMPLEXITY
                    </span>
                    {result.question_types.map(t => (
                      <span key={t} className="text-[9px] font-black uppercase px-3 py-1 rounded-lg border border-white/20 bg-brand-coral/10 text-brand-coral">
                        {QUESTION_TYPE_LABELS[t]}
                      </span>
                    ))}
                  </div>
                </div>
                {saved && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-green-400 rounded-2xl border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]">
                      <CheckSquare className="h-6 w-6 text-black" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-green-400">Archived</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                {result.questions.map((q, i) => (
                  <QuestionCard key={i} q={q} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

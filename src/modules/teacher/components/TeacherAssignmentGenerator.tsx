import { useState, useEffect } from 'react';
import { listAgents } from '../../../services/backendApi';
import {
  teacherGenerateAssignment,
  type AssignmentType, type AssignmentQuestion, type TeacherAssignmentResult,
} from '../../../services/backendApi';
import { BookOpen, Bot, ChevronDown, CheckSquare, Square, Loader, Calendar } from 'lucide-react';

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
    <div className="border-2 border-black rounded-2xl overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <span className="text-xs font-extrabold uppercase bg-black text-white px-2 py-1 rounded-full shrink-0">
            Q{index + 1}
          </span>
          <span className="text-xs font-bold border border-black px-2 py-0.5 rounded-full text-gray-500">
            {TYPE_LABELS[q.type]?.label ?? q.type}
          </span>
          <span className="text-xs font-bold text-gray-400">{q.marks} marks</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t-2 border-black bg-gray-50 space-y-3">
          <p className="font-bold text-black pt-4">{q.question}</p>
          {q.guidance && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-2.5">
              <p className="text-xs font-extrabold text-yellow-700 uppercase tracking-wide mb-1">Guidance for students</p>
              <p className="text-sm text-yellow-800">{q.guidance}</p>
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

  const totalMarks = result
    ? result.questions.reduce((s, q) => s + q.marks, 0)
    : assignmentTypes.reduce((s, t) => s + TYPE_MARKS[t] * Math.ceil(count / assignmentTypes.length), 0);

  const handleGenerate = async () => {
    if (!selectedAgentId) { setError('Select an agent first'); return; }
    if (!topic.trim()) { setError('Enter a topic'); return; }
    if (!deadline) { setError('Set a deadline'); return; }

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
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Min deadline: now + 1 hour
  const minDeadline = new Date(Date.now() + 3600_000).toISOString().slice(0, 16);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-black rounded-full">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">AI Assignment Generator</h2>
          <p className="text-sm text-gray-500 font-medium">Generate graded assignments from your uploaded notes</p>
        </div>
      </div>

      {/* Config card */}
      <div className="bg-white border-2 border-black rounded-[2rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">

        {/* Agent */}
        <div>
          <label className="block text-sm font-extrabold mb-1.5">Select Agent</label>
          {agentsLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader className="h-4 w-4 animate-spin" />Loading…</div>
          ) : agents.length === 0 ? (
            <p className="text-sm text-gray-500">No agents found. Create one in the AI Agent tab first.</p>
          ) : (
            <div className="relative">
              <select
                value={selectedAgentId}
                onChange={e => setSelectedAgentId(e.target.value)}
                className="w-full appearance-none border-2 border-black rounded-xl px-4 py-2.5 pr-10 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">— choose agent —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-extrabold mb-1.5">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Newton's Laws of Motion"
            className="w-full border-2 border-black rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Assignment types */}
        <div>
          <label className="block text-sm font-extrabold mb-2">Assignment Types</label>
          <div className="space-y-2">
            {(Object.keys(TYPE_LABELS) as AssignmentType[]).map(t => {
              const selected = assignmentTypes.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-black'
                  }`}
                >
                  {selected ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                  <div className="flex-1">
                    <p className="font-bold text-sm">{TYPE_LABELS[t].label}</p>
                    <p className={`text-xs ${selected ? 'text-gray-300' : 'text-gray-400'}`}>{TYPE_LABELS[t].desc} · {TYPE_MARKS[t]} marks each</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Count + Deadline row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-extrabold mb-1.5">
              Questions: <span className="text-[#FF6B57]">{count}</span>
              <span className="text-gray-400 font-normal ml-2">(~{totalMarks} total marks)</span>
            </label>
            <input
              type="range" min={1} max={10} value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full accent-black"
            />
            <div className="flex justify-between text-xs text-gray-400 font-bold mt-1">
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Deadline
            </label>
            <input
              type="datetime-local"
              min={minDeadline}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full border-2 border-black rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-300 rounded-xl px-4 py-2">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3 bg-[#FF6B57] text-black font-extrabold rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <><Loader className="h-4 w-4 animate-spin" />Generating…</> : <><Bot className="h-4 w-4" />Generate Assignment</>}
        </button>
      </div>

      {/* Preview */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-extrabold capitalize">{result.topic}</h3>
              <p className="text-sm text-gray-500 mt-0.5 font-medium">
                Deadline: {new Date(result.deadline).toLocaleString()} ·{' '}
                {result.questions.reduce((s, q) => s + q.marks, 0)} total marks
              </p>
            </div>
            <span className="text-xs font-extrabold bg-green-100 border border-green-400 text-green-700 px-3 py-1 rounded-full shrink-0">
              Saved ✓
            </span>
          </div>

          <div className="space-y-3">
            {result.questions.map((q, i) => (
              <QuestionPreview key={i} q={q} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

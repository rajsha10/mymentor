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
    <div className="border-2 border-black rounded-2xl p-5 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xs font-extrabold uppercase bg-black text-white px-2 py-1 rounded-full shrink-0">
          Q{index + 1}
        </span>
        <span className="text-xs font-bold uppercase border border-black px-2 py-1 rounded-full text-gray-600 shrink-0">
          {QUESTION_TYPE_LABELS[q.type] ?? q.type}
        </span>
      </div>
      <p className="font-bold text-black mb-3">{q.question}</p>
      {Array.isArray(q.options) && q.options.length > 0 && (
        <ul className="space-y-1 mb-3">
          {q.options.map((opt, i) => (
            <li
              key={i}
              className={`text-sm px-3 py-1.5 rounded-xl border font-medium ${
                opt.startsWith(q.answer + ')')
                  ? 'bg-green-50 border-green-400 text-green-800 font-bold'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
      {!q.options && (
        <div className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700">
          <span className="font-bold text-black">Answer: </span>{q.answer}
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
    if (!selectedAgentId) { setError('Select an agent first'); return; }
    if (!topic.trim()) { setError('Enter a topic'); return; }

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
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-black rounded-full">
          <FlaskConical className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">AI Test Generator</h2>
          <p className="text-sm text-gray-500 font-medium">Generate tests from your uploaded notes</p>
        </div>
      </div>

      {/* Config card */}
      <div className="bg-white border-2 border-black rounded-[2rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-5">

        {/* Agent selector */}
        <div>
          <label className="block text-sm font-extrabold mb-1.5">Select Agent</label>
          {agentsLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader className="h-4 w-4 animate-spin" />Loading agents…</div>
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
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
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
            placeholder="e.g. Second Law of Thermodynamics"
            className="w-full border-2 border-black rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-extrabold mb-2">Difficulty</label>
          <div className="flex gap-3">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2.5 rounded-xl border-2 font-extrabold text-sm transition-all ${
                  difficulty === d
                    ? `${diffColors[d]} border-current shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`
                    : 'bg-white border-gray-300 text-gray-500 hover:border-black'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Question Types */}
        <div>
          <label className="block text-sm font-extrabold mb-2">Question Types</label>
          <div className="flex flex-col gap-2">
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(t => {
              const selected = questionTypes.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 font-bold text-sm text-left transition-all ${
                    selected
                      ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-black'
                  }`}
                >
                  {selected ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                  {QUESTION_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Count */}
        <div>
          <label className="block text-sm font-extrabold mb-1.5">
            Number of Questions: <span className="text-[#FF6B57]">{count}</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full accent-black"
          />
          <div className="flex justify-between text-xs text-gray-400 font-bold mt-1">
            <span>1</span><span>10</span><span>20</span>
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
          {loading ? (
            <><Loader className="h-4 w-4 animate-spin" />Generating…</>
          ) : (
            <><Bot className="h-4 w-4" />Generate Test</>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-extrabold">{result.topic}</h3>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${diffColors[result.difficulty]}`}>
                  {result.difficulty}
                </span>
                {result.question_types.map(t => (
                  <span key={t} className="text-xs font-bold px-2 py-0.5 rounded-full border border-black bg-gray-100">
                    {QUESTION_TYPE_LABELS[t]}
                  </span>
                ))}
              </div>
            </div>
            {saved && (
              <span className="text-xs font-extrabold bg-green-100 border border-green-400 text-green-700 px-3 py-1 rounded-full">
                Saved ✓
              </span>
            )}
          </div>
          <div className="space-y-4">
            {result.questions.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

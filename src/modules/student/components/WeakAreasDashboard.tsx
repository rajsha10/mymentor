import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FlaskConical, MessageCircle, Loader, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { generateTest, listClassroomAgents } from '../../../services/backendApi';
import TestModal from './TestModal';

type WeakArea = { topic: string; total_queries: number; low_confidence_count: number; weak_score: number };

type ClassroomEntry = {
  classroom_id: string;
  weak_areas: WeakArea[];
  query_count: number;
};

type Classroom = { id: string; name: string; subject?: string };

type TestResult = {
  topic: string;
  weak_score: number;
  test: { question: string; options: string[]; answer: string }[];
};

// weak_score is 0–100: higher = more low-confidence queries on this topic
function confidenceLabel(weakScore: number): { label: string; color: string; dot: string } {
  if (weakScore >= 70) return { label: 'Low confidence',    color: 'text-red-600 bg-red-50 border-red-300',         dot: '🔴' };
  if (weakScore >= 40) return { label: 'Medium confidence', color: 'text-yellow-600 bg-yellow-50 border-yellow-300', dot: '🟡' };
  return                      { label: 'High confidence',   color: 'text-green-600 bg-green-50 border-green-300',    dot: '🟢' };
}

type TopicRowProps = {
  topic: WeakArea;
  classroomId: string;
  classrooms: Classroom[];
};

function TopicRow({ topic, classroomId, classrooms }: TopicRowProps) {
  const navigate = useNavigate();
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<{ score: number; total: number; date: string }[]>([]);
  const [error, setError] = useState('');

  const conf = confidenceLabel(topic.weak_score);

  const handleGenerateTest = async () => {
    setError('');
    setTestLoading(true);
    try {
      // find any agent in this classroom to generate the test
      let agentId: string | null = null;
      if (classroomId !== 'personal') {
        const agents = await listClassroomAgents(classroomId);
        agentId = agents[0]?.id ?? null;
      }
      if (!agentId) {
        setError('No agent found for this classroom.');
        return;
      }
      const data = await generateTest(agentId);
      setTestResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate test.');
    } finally {
      setTestLoading(false);
    }
  };

  const handlePractice = () => {
    if (classroomId === 'personal' || classroomId.startsWith('personal_')) return;
    navigate(`/classroom/${classroomId}`);
  };

  const isPersonal = classroomId === 'personal' || classroomId.startsWith('personal_');

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        {/* Topic info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-extrabold text-black capitalize">{topic.topic}</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${conf.color}`}>
              {conf.dot} {conf.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            {topic.total_queries} question{topic.total_queries !== 1 ? 's' : ''} · {topic.low_confidence_count} low confidence
          </p>
          {testHistory.length > 0 && (
            <p className="text-xs text-green-600 font-bold mt-0.5">
              ✓ Last test: {testHistory[0].score}/{testHistory[0].total} on {testHistory[0].date}
            </p>
          )}
          {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {!isPersonal && (
            <button
              onClick={handlePractice}
              className="flex items-center gap-1.5 px-4 py-2 border-2 border-black rounded-full text-xs font-bold bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Practice
            </button>
          )}
          <button
            onClick={handleGenerateTest}
            disabled={testLoading}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-black rounded-full text-xs font-bold bg-black text-white hover:bg-[#FF6B57] hover:border-[#FF6B57] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {testLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
            {testLoading ? 'Generating…' : 'Generate Test'}
          </button>
        </div>
      </div>

      {testResult && testResult.test.length > 0 && (
        <TestModal
          topic={testResult.topic}
          questions={testResult.test}
          onClose={(score, total) => {
            if (score !== undefined && total !== undefined) {
              setTestHistory(prev => [
                { score, total, date: new Date().toLocaleDateString() },
                ...prev,
              ]);
            }
            setTestResult(null);
          }}
        />
      )}
    </>
  );
}

type ClassroomBlockProps = {
  entry: ClassroomEntry;
  classrooms: Classroom[];
};

function ClassroomBlock({ entry, classrooms }: ClassroomBlockProps) {
  const [open, setOpen] = useState(true);
  const classroom = classrooms.find(c => c.id === entry.classroom_id);
  const isPersonal = entry.classroom_id === 'personal' || entry.classroom_id.startsWith('personal_');
  const label = classroom?.name ?? (isPersonal ? 'Personal Agents' : entry.classroom_id);
  const subject = classroom?.subject;
  const weakTopics = entry.weak_areas;

  if (weakTopics.length === 0) return null;

  return (
    <div className="rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Classroom header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-[#FAFAFA] border-b-2 border-black hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF6B57] rounded-full border-2 border-black flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-black" />
          </div>
          <div className="text-left">
            <p className="font-extrabold text-black text-sm">{label}</p>
            {subject && <p className="text-xs text-gray-400 font-medium">{subject}</p>}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded-full">
            {weakTopics.length} weak topic{weakTopics.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {/* Topic rows */}
      {open && (
        <div className="p-4 space-y-3 bg-white">
          {weakTopics.map(area => (
            <TopicRow
              key={area.topic}
              topic={area}
              classroomId={entry.classroom_id}
              classrooms={classrooms}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  insights: {
    by_classroom: ClassroomEntry[];
    total_queries: number;
  };
  classrooms: Classroom[];
  loading: boolean;
};

export default function WeakAreasDashboard({ insights, classrooms, loading }: Props) {
  const allWeak = insights.by_classroom.filter(e => e.weak_areas.length > 0);

  return (
    <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b-2 border-black flex items-center gap-3 bg-[#FAFAFA]">
        <div className="w-8 h-8 bg-[#FF6B57] rounded-full border-2 border-black flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-black" />
        </div>
        <h3 className="text-base font-extrabold text-black">⚠️ Weak Areas</h3>
        {!loading && allWeak.length > 0 && (
          <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
            {allWeak.reduce((sum, e) => sum + e.weak_areas.length, 0)} topics to improve
          </span>
        )}
      </div>

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse border-2 border-black" />)}
          </div>
        ) : insights.total_queries === 0 ? (
          <div className="flex items-center gap-3 text-gray-400 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-bold">Ask your first question to see weak areas here.</p>
          </div>
        ) : allWeak.length === 0 ? (
          <div className="flex items-center gap-3 py-6 text-green-700">
            <CheckCircle className="h-6 w-6 shrink-0 text-green-500" />
            <div>
              <p className="font-extrabold text-sm">No weak areas detected!</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">You're performing well across all topics. Keep it up!</p>
            </div>
          </div>
        ) : (
          allWeak.map(entry => (
            <ClassroomBlock key={entry.classroom_id} entry={entry} classrooms={classrooms} />
          ))
        )}
      </div>
    </div>
  );
}

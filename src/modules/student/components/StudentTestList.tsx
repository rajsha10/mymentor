import { useState, useEffect, useCallback } from 'react';
import { listStudentTests, type StudentTestSummary, type SubmitTestResult } from '../../../services/backendApi';
import StudentTestAttempt from './StudentTestAttempt';
import { FlaskConical, Loader, Trophy, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  classId: number;  // numeric Supabase class_id
}

function ScoreBadge({ score, attempted }: { score: number | null; attempted: boolean }) {
  if (!attempted) return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full border-2 border-gray-300 text-gray-500 bg-white">
      Not Attempted
    </span>
  );
  if (score === null) return null;
  const color =
    score >= 80 ? 'bg-green-50 border-green-400 text-green-700' :
    score >= 60 ? 'bg-yellow-50 border-yellow-400 text-yellow-700' :
    'bg-red-50 border-red-400 text-red-700';
  return (
    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border-2 ${color}`}>
      {score.toFixed(0)}%
    </span>
  );
}

export default function StudentTestList({ classId }: Props) {
  const [tests, setTests] = useState<StudentTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attemptingId, setAttemptingId] = useState<number | null>(null);
  const [attemptingTopic, setAttemptingTopic] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listStudentTests(classId);
      setTests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  const handleAttemptClose = (result?: SubmitTestResult) => {
    setAttemptingId(null);
    setAttemptingTopic('');
    if (result) {
      // Update the test in the list with the new score
      setTests(prev => prev.map(t =>
        t.id === attemptingId
          ? { ...t, attempted: true, score: result.score_pct, evaluated_at: new Date().toISOString() }
          : t
      ));
    }
  };

  const pending = tests.filter(t => !t.attempted);
  const completed = tests.filter(t => t.attempted);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-black rounded-full">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">My Tests</h2>
            <p className="text-sm text-gray-500 font-medium">Tests assigned by your teacher</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 border-2 border-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
          <Loader className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading tests…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 py-8 text-red-500 bg-red-50 border-2 border-red-300 rounded-2xl px-5">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {!loading && !error && tests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 space-y-3">
          <FlaskConical className="h-12 w-12 text-gray-200" />
          <p className="font-bold text-gray-500">No tests yet</p>
          <p className="text-sm">Your teacher hasn't assigned any tests for this classroom.</p>
        </div>
      )}

      {!loading && !error && tests.length > 0 && (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Pending ({pending.length})
              </h3>
              <div className="space-y-3">
                {pending.map(t => (
                  <div
                    key={t.id}
                    className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-black capitalize truncate">{t.topic}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-medium">
                        {t.question_count} question{t.question_count !== 1 ? 's' : ''} ·{' '}
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ScoreBadge score={t.score} attempted={t.attempted} />
                      <button
                        onClick={() => { setAttemptingId(t.id); setAttemptingTopic(t.topic); }}
                        className="px-4 py-2 bg-[#FF6B57] text-black font-extrabold text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                      >
                        Attempt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Completed ({completed.length})
              </h3>
              <div className="space-y-3">
                {completed.map(t => (
                  <div
                    key={t.id}
                    className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-gray-700 capitalize truncate">{t.topic}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 font-medium">
                        {t.question_count} questions ·{' '}
                        {t.evaluated_at
                          ? `Submitted ${new Date(t.evaluated_at).toLocaleDateString()}`
                          : 'Completed'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ScoreBadge score={t.score} attempted={t.attempted} />
                      {t.score !== null && (
                        <Trophy className={`h-4 w-4 ${
                          (t.score ?? 0) >= 80 ? 'text-green-500' :
                          (t.score ?? 0) >= 60 ? 'text-yellow-500' : 'text-red-400'
                        }`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Test attempt modal */}
      {attemptingId !== null && (
        <StudentTestAttempt
          testId={attemptingId}
          topic={attemptingTopic}
          onClose={handleAttemptClose}
        />
      )}
    </div>
  );
}

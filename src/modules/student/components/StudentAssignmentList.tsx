import { useState, useEffect, useCallback } from 'react';
import { listStudentAssignments, type AssignmentSummary, type SubmitAssignmentResult } from '../../../services/backendApi';
import StudentAssignmentAttempt from './StudentAssignmentAttempt';
import { BookOpen, Loader, CheckCircle, Clock, AlertTriangle, RefreshCw, Lock } from 'lucide-react';

interface Props {
  classId: number;
}

function DeadlineBadge({ deadline, submitted }: { deadline: string; submitted: boolean }) {
  const now = new Date();
  const dl = new Date(deadline);
  const isPast = now > dl;
  const hoursLeft = Math.max(0, (dl.getTime() - now.getTime()) / 3_600_000);

  if (submitted) return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full border-2 bg-green-50 border-green-400 text-green-700">
      Submitted
    </span>
  );
  if (isPast) return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full border-2 bg-red-50 border-red-400 text-red-700 flex items-center gap-1">
      <Lock className="h-3 w-3" /> Closed
    </span>
  );
  if (hoursLeft < 24) return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full border-2 bg-yellow-50 border-yellow-400 text-yellow-700">
      Due in {Math.round(hoursLeft)}h
    </span>
  );
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full border-2 bg-gray-50 border-gray-300 text-gray-500">
      Due {dl.toLocaleDateString()}
    </span>
  );
}

export default function StudentAssignmentList({ classId }: Props) {
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attemptingId, setAttemptingId] = useState<number | null>(null);
  const [attemptingTopic, setAttemptingTopic] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listStudentAssignments(classId);
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  const handleAttemptClose = (result?: SubmitAssignmentResult) => {
    const id = attemptingId;
    setAttemptingId(null);
    setAttemptingTopic('');
    if (result && id !== null) {
      setAssignments(prev => prev.map(a =>
        a.id === id
          ? { ...a, submitted: true, marks: result.marks, submitted_at: new Date().toISOString() }
          : a
      ));
    }
  };

  const canAttempt = (a: AssignmentSummary) =>
    !a.submitted && new Date() <= new Date(a.deadline);

  const pending = assignments.filter(a => !a.submitted);
  const done = assignments.filter(a => a.submitted);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-black rounded-full">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Assignments</h2>
            <p className="text-sm text-gray-500 font-medium">AI-generated assignments from your teacher</p>
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

      {loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
          <Loader className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading assignments…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 py-6 text-red-500 bg-red-50 border-2 border-red-300 rounded-2xl px-5">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {!loading && !error && assignments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 space-y-3">
          <BookOpen className="h-12 w-12 text-gray-200" />
          <p className="font-bold text-gray-500">No assignments yet</p>
          <p className="text-sm">Your teacher hasn't posted any AI assignments for this classroom.</p>
        </div>
      )}

      {!loading && !error && assignments.length > 0 && (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Pending ({pending.length})
              </h3>
              <div className="space-y-3">
                {pending.map(a => {
                  const open = canAttempt(a);
                  return (
                    <div
                      key={a.id}
                      className={`bg-white border-2 rounded-2xl p-5 flex items-center justify-between gap-4 ${
                        open
                          ? 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                          : 'border-gray-200 opacity-70'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-black capitalize truncate">{a.topic}</p>
                        <p className="text-xs text-gray-400 mt-0.5 font-medium">
                          {a.question_count} question{a.question_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <DeadlineBadge deadline={a.deadline} submitted={a.submitted} />
                        {open ? (
                          <button
                            onClick={() => { setAttemptingId(a.id); setAttemptingTopic(a.topic); }}
                            className="px-4 py-2 bg-[#FF6B57] text-black font-extrabold text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                          >
                            Start
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                            <Lock className="h-3.5 w-3.5" /> Closed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Submitted */}
          {done.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Submitted ({done.length})
              </h3>
              <div className="space-y-3">
                {done.map(a => (
                  <div key={a.id} className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-gray-700 capitalize truncate">{a.topic}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-medium">
                        {a.question_count} questions ·{' '}
                        {a.submitted_at ? `Submitted ${new Date(a.submitted_at).toLocaleDateString()}` : 'Submitted'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {a.marks !== null ? (
                        <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border-2 ${
                          (a.marks / (a.question_count * 10)) >= 0.8
                            ? 'bg-green-50 border-green-400 text-green-700'
                            : (a.marks / (a.question_count * 10)) >= 0.6
                            ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                            : 'bg-red-50 border-red-400 text-red-700'
                        }`}>
                          {a.marks.toFixed(1)} marks
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">Pending review</span>
                      )}
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {attemptingId !== null && (
        <StudentAssignmentAttempt
          assignmentId={attemptingId}
          topic={attemptingTopic}
          onClose={handleAttemptClose}
        />
      )}
    </div>
  );
}

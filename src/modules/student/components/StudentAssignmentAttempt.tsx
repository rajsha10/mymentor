import { useState, useEffect } from 'react';
import {
  getStudentAssignment, submitStudentAssignment,
  type AssignmentDetail, type AssignmentQuestion,
  type SubmitAssignmentResult,
} from '../../../services/backendApi';
import { X, Loader, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle, BookOpen } from 'lucide-react';

interface Props {
  assignmentId: number;
  topic: string;
  onClose: (result?: SubmitAssignmentResult) => void;
}

type Phase = 'loading' | 'attempt' | 'submitting' | 'result' | 'error';

const TYPE_LABEL: Record<string, string> = {
  descriptive: 'Descriptive',
  long_form:   'Long Form Essay',
  project:     'Project Task',
};

const MIN_WORDS: Record<string, number> = {
  descriptive: 50,
  long_form: 150,
  project: 100,
};

function WordCountBadge({ text, min }: { text: string; min: number }) {
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ok = count >= min;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
      ok ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-50 text-gray-500'
    }`}>
      {count} / {min} words min
    </span>
  );
}

export default function StudentAssignmentAttempt({ assignmentId, topic, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<SubmitAssignmentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getStudentAssignment(assignmentId)
      .then(d => { setAssignment(d); setPhase('attempt'); })
      .catch(err => { setErrorMsg(err.message); setPhase('error'); });
  }, [assignmentId]);

  const questions = assignment?.questions ?? [];
  const q: AssignmentQuestion | undefined = questions[current];
  const answeredCount = Object.values(answers).filter(a => a.trim().length > 0).length;
  const allAnswered = answeredCount === questions.length;

  const isPastDeadline = assignment
    ? new Date() > new Date(assignment.deadline)
    : false;

  const handleSubmit = async () => {
    if (!allAnswered) { alert('Please answer all questions before submitting.'); return; }
    if (isPastDeadline) { alert('The deadline has passed.'); return; }
    setPhase('submitting');
    try {
      const payload = Object.entries(answers).map(([idx, ans]) => ({
        question_index: Number(idx),
        answer: ans.trim(),
      }));
      const res = await submitStudentAssignment(assignmentId, payload);
      setResult(res);
      setPhase('result');
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed');
      setPhase('error');
    }
  };

  const scorePct = result ? result.score_pct : 0;
  const scoreColor = scorePct >= 80 ? 'text-green-600' : scorePct >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = scorePct >= 80 ? 'bg-green-50 border-green-400' : scorePct >= 60 ? 'bg-yellow-50 border-yellow-400' : 'bg-red-50 border-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black shrink-0">
          <div>
            <h2 className="text-lg font-extrabold capitalize">{topic}</h2>
            {assignment && (
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Deadline: {new Date(assignment.deadline).toLocaleString()}
                {isPastDeadline && <span className="text-red-500 font-bold ml-2">· CLOSED</span>}
              </p>
            )}
          </div>
          <button onClick={() => onClose(result ?? undefined)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Progress strip */}
        {phase === 'attempt' && (
          <div className="px-6 pt-3 shrink-0">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full transition-all duration-300"
                style={{ width: `${Math.round((answeredCount / questions.length) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1">{answeredCount} of {questions.length} answered</p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
              <Loader className="h-6 w-6 animate-spin" />
              <p className="text-sm font-medium">Loading assignment…</p>
            </div>
          )}

          {phase === 'submitting' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-500">
              <Loader className="h-6 w-6 animate-spin" />
              <p className="text-sm font-medium">Submitting and evaluating…</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-red-500">
              <AlertTriangle className="h-6 w-6" />
              <p className="text-sm font-bold">{errorMsg}</p>
            </div>
          )}

          {phase === 'attempt' && q && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase bg-black text-white px-2 py-1 rounded-full">
                  Q{current + 1} of {questions.length}
                </span>
                <span className="text-xs font-bold border border-black px-2 py-0.5 rounded-full text-gray-500">
                  {TYPE_LABEL[q.type] ?? q.type}
                </span>
                <span className="text-xs font-bold text-gray-400">{q.marks} marks</span>
              </div>

              <p className="font-bold text-gray-900 text-base leading-snug">{q.question}</p>

              {q.guidance && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-extrabold text-blue-600 uppercase tracking-wide mb-1">Guidance</p>
                  <p className="text-sm text-blue-800">{q.guidance}</p>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">Your Answer</label>
                  <WordCountBadge text={answers[current] ?? ''} min={MIN_WORDS[q.type] ?? 50} />
                </div>
                <textarea
                  rows={q.type === 'long_form' ? 10 : q.type === 'project' ? 8 : 6}
                  value={answers[current] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [current]: e.target.value }))}
                  placeholder={
                    q.type === 'descriptive'
                      ? 'Write a detailed descriptive answer covering all aspects of the question…'
                      : q.type === 'long_form'
                      ? 'Write a structured essay response with introduction, body paragraphs, and conclusion…'
                      : 'Describe your project design, approach, methodology, and expected deliverables…'
                  }
                  className="w-full border-2 border-black rounded-xl px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          )}

          {phase === 'result' && result && (
            <div className="space-y-5">
              {/* Score card */}
              <div className={`rounded-2xl border-2 p-5 ${scoreBg}`}>
                <div className="flex items-center gap-4">
                  <BookOpen className={`h-8 w-8 shrink-0 ${scoreColor}`} />
                  <div>
                    <p className={`text-3xl font-extrabold ${scoreColor}`}>
                      {result.marks.toFixed(1)} / {result.max_marks}
                    </p>
                    <p className="text-sm font-bold text-gray-600">{result.score_pct.toFixed(0)}%</p>
                  </div>
                </div>
                <p className="mt-3 text-xs font-bold text-gray-500 italic">{result.note}</p>
              </div>

              {/* Per-question breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">Answer Breakdown</h3>
                {result.breakdown.map((b, i) => (
                  <div key={i} className="border-2 border-gray-200 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-800 flex-1">Q{i + 1}. {b.question}</p>
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ml-3 shrink-0 ${
                        b.marks_earned >= b.marks_total * 0.6
                          ? 'bg-green-50 border-green-400 text-green-700'
                          : 'bg-yellow-50 border-yellow-400 text-yellow-700'
                      }`}>
                        {b.marks_earned.toFixed(1)} / {b.marks_total}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">{b.word_count} words written</p>
                    {b.marks_earned < b.marks_total * 0.6 && (
                      <p className="text-xs text-yellow-700 font-bold">
                        Tip: Answer was too brief or missed key concepts. Review the topic and try again next time.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-black shrink-0">
          {phase === 'attempt' && (
            <div className="flex items-center gap-3">
              <button
                disabled={current === 0}
                onClick={() => setCurrent(c => c - 1)}
                className="p-2.5 border-2 border-black rounded-xl disabled:opacity-30 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex-1 flex gap-1.5 flex-wrap">
                {questions.map((_, i) => {
                  const hasAnswer = (answers[i] ?? '').trim().length > 0;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`w-8 h-8 rounded-lg border-2 text-xs font-extrabold transition-all ${
                        i === current
                          ? 'bg-black text-white border-black'
                          : hasAnswer
                          ? 'bg-green-600 text-white border-green-600'
                          : 'border-gray-300 text-gray-400 hover:border-black'
                      }`}
                    >
                      {hasAnswer && i !== current ? <CheckCircle className="h-3.5 w-3.5 mx-auto" /> : i + 1}
                    </button>
                  );
                })}
              </div>

              {current < questions.length - 1 ? (
                <button
                  onClick={() => setCurrent(c => c + 1)}
                  className="p-2.5 border-2 border-black rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || isPastDeadline}
                  className="px-5 py-2.5 bg-[#FF6B57] text-black font-extrabold rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Submit
                </button>
              )}
            </div>
          )}

          {(phase === 'result' || phase === 'error') && (
            <button
              onClick={() => onClose(result ?? undefined)}
              className="w-full py-3 bg-black text-white font-extrabold rounded-xl border-2 border-black hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

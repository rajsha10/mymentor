import { useState, useEffect } from 'react';
import {
  getStudentTest, submitStudentTest,
  type StudentTestDetail, type StudentTestQuestion,
  type AnswerBreakdown, type SubmitTestResult,
} from '../../../services/backendApi';
import {
  X, Loader, CheckCircle, XCircle, Trophy, AlertTriangle, ChevronRight, ChevronLeft,
} from 'lucide-react';

interface Props {
  testId: number;
  topic: string;
  onClose: (result?: SubmitTestResult) => void;
}

type Phase = 'loading' | 'attempt' | 'submitting' | 'result' | 'error';

const TYPE_LABEL: Record<string, string> = {
  mcq: 'MCQ',
  short_answer: 'Short Answer',
  conceptual: 'Conceptual',
};

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-black rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MCQQuestion({
  q, index, selected, submitted, breakdown, onChange,
}: {
  q: StudentTestQuestion;
  index: number;
  selected: string;
  submitted: boolean;
  breakdown?: AnswerBreakdown;
  onChange: (val: string) => void;
}) {
  return (
    <div className="space-y-3">
      {(Array.isArray(q.options) ? q.options : []).map((opt) => {
        const letter = opt[0].toUpperCase();
        let style = 'border-gray-200 bg-white text-gray-700 hover:border-black hover:bg-gray-50';
        if (!submitted) {
          if (selected === letter) style = 'border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';
        } else {
          const isCorrect = letter === breakdown?.correct_answer?.toUpperCase();
          const isChosen = letter === selected?.toUpperCase();
          if (isCorrect) style = 'border-green-500 bg-green-50 text-green-800 font-bold';
          else if (isChosen) style = 'border-red-400 bg-red-50 text-red-700';
          else style = 'border-gray-100 bg-white text-gray-400';
        }
        return (
          <button
            key={opt}
            disabled={submitted}
            onClick={() => onChange(letter)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm text-left transition-all ${style}`}
          >
            {submitted && letter === breakdown?.correct_answer?.toUpperCase() && (
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            )}
            {submitted && letter === selected?.toUpperCase() && letter !== breakdown?.correct_answer?.toUpperCase() && (
              <XCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            {(!submitted || (letter !== breakdown?.correct_answer?.toUpperCase() && letter !== selected?.toUpperCase())) && (
              <span className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                !submitted && selected === letter ? 'border-white bg-white' : 'border-gray-300'
              }`} />
            )}
            <span className="font-medium">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function OpenQuestion({
  index, value, submitted, breakdown, onChange, placeholder,
}: {
  index: number;
  value: string;
  submitted: boolean;
  breakdown?: AnswerBreakdown;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-3">
      <textarea
        disabled={submitted}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full border-2 border-black rounded-xl px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-50 disabled:text-gray-500"
      />
      {submitted && breakdown && (
        <div className={`rounded-xl border-2 px-4 py-3 text-sm ${breakdown.correct ? 'border-green-400 bg-green-50' : 'border-yellow-400 bg-yellow-50'}`}>
          <p className="font-extrabold mb-1 text-gray-800">
            {breakdown.correct ? '✓ Good answer' : `Score: ${Math.round(breakdown.points * 100)}%`}
          </p>
          <p className="text-gray-600"><span className="font-bold">Model answer: </span>{breakdown.correct_answer}</p>
        </div>
      )}
    </div>
  );
}

export default function StudentTestAttempt({ testId, topic, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [test, setTest] = useState<StudentTestDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<SubmitTestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getStudentTest(testId)
      .then(data => { setTest(data); setPhase('attempt'); })
      .catch(err => { setErrorMsg(err.message); setPhase('error'); });
  }, [testId]);

  const questions = test?.questions ?? [];
  const q = questions[current];
  const answered = Object.keys(answers).length;
  const allAnswered = answered === questions.length;

  const setAnswer = (idx: number, val: string) =>
    setAnswers(prev => ({ ...prev, [idx]: val }));

  const handleSubmit = async () => {
    if (!allAnswered) {
      alert(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }
    setPhase('submitting');
    try {
      const payload = Object.entries(answers).map(([idx, ans]) => ({
        question_index: Number(idx),
        answer: ans,
      }));
      const res = await submitStudentTest(testId, payload);
      setResult(res);
      setPhase('result');
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed');
      setPhase('error');
    }
  };

  const scoreColor = (pct: number) =>
    pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600';

  const scoreBg = (pct: number) =>
    pct >= 80 ? 'bg-green-50 border-green-400' : pct >= 60 ? 'bg-yellow-50 border-yellow-400' : 'bg-red-50 border-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-black capitalize">{topic}</h2>
            {phase === 'attempt' && (
              <p className="text-xs text-gray-500 mt-0.5">
                Q{current + 1} of {questions.length} · {answered} answered
              </p>
            )}
          </div>
          <button onClick={() => onClose(result ?? undefined)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Progress */}
        {phase === 'attempt' && (
          <div className="px-6 pt-3 shrink-0">
            <ProgressBar current={answered} total={questions.length} />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
              <Loader className="h-6 w-6 animate-spin" />
              <p className="text-sm font-medium">Loading test…</p>
            </div>
          )}

          {/* Submitting */}
          {phase === 'submitting' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-500">
              <Loader className="h-6 w-6 animate-spin" />
              <p className="text-sm font-medium">Evaluating your answers…</p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-red-500">
              <AlertTriangle className="h-6 w-6" />
              <p className="text-sm font-bold">{errorMsg}</p>
            </div>
          )}

          {/* Attempt */}
          {phase === 'attempt' && q && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase bg-black text-white px-2 py-1 rounded-full">
                  Q{current + 1}
                </span>
                <span className="text-xs font-bold border border-black px-2 py-0.5 rounded-full text-gray-500">
                  {TYPE_LABEL[q.type] ?? q.type}
                </span>
              </div>
              <p className="font-bold text-gray-900 text-base leading-snug">{q.question}</p>

              {q.type === 'mcq' ? (
                <MCQQuestion
                  q={q}
                  index={current}
                  selected={answers[current] ?? ''}
                  submitted={false}
                  onChange={val => {
                    setAnswer(current, val);
                    // auto-advance to next question after brief highlight
                    if (current < questions.length - 1) {
                      setTimeout(() => setCurrent(c => c + 1), 350);
                    }
                  }}
                />
              ) : (
                <OpenQuestion
                  index={current}
                  value={answers[current] ?? ''}
                  submitted={false}
                  onChange={val => setAnswer(current, val)}
                  placeholder={
                    q.type === 'short_answer'
                      ? 'Write a brief answer (1–2 sentences)…'
                      : 'Explain your understanding in detail…'
                  }
                />
              )}
            </div>
          )}

          {/* Result */}
          {phase === 'result' && result && (
            <div className="space-y-6">
              {/* Score banner */}
              <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 ${scoreBg(result.score_pct)}`}>
                <Trophy className={`h-8 w-8 shrink-0 ${scoreColor(result.score_pct)}`} />
                <div>
                  <p className={`text-3xl font-extrabold ${scoreColor(result.score_pct)}`}>
                    {result.score.toFixed(1)} / {result.max_score}
                  </p>
                  <p className="text-sm font-bold text-gray-600">
                    {result.score_pct}% ·{' '}
                    {result.score_pct >= 80
                      ? 'Excellent work!'
                      : result.score_pct >= 60
                      ? 'Good effort — review weak areas.'
                      : 'Keep practicing — focus on weak areas.'}
                  </p>
                </div>
              </div>

              {/* Weak areas */}
              {result.weak_areas.length > 0 && (
                <div className="border-2 border-yellow-400 bg-yellow-50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm font-extrabold text-yellow-800">Weak Areas Detected</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.weak_areas.map(a => (
                      <span key={a} className="text-xs font-bold px-2 py-1 bg-yellow-100 border border-yellow-400 rounded-full text-yellow-800 capitalize">
                        {a}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">These topics were added to your weak areas. Use the AI agent to review them.</p>
                </div>
              )}

              {/* Per-question breakdown */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-gray-700 uppercase tracking-wide">Answer Review</h3>
                {result.breakdown.map((b, i) => {
                  // For MCQ: resolve letter → full option text from the original questions list
                  const origQ = questions[i];
                  const optMap: Record<string, string> = {};
                  if (origQ?.options) {
                    origQ.options.forEach(opt => {
                      const letter = opt.trim()[0]?.toUpperCase();
                      if (letter) optMap[letter] = opt.trim();
                    });
                  }
                  const studentLabel = b.type === 'mcq'
                    ? (optMap[b.student_answer?.toUpperCase()] ?? b.student_answer ?? '(blank)')
                    : (b.student_answer || '(blank)');
                  const correctLabel = b.type === 'mcq'
                    ? (optMap[b.correct_answer?.toUpperCase()] ?? b.correct_answer)
                    : b.correct_answer;

                  return (
                  <div
                    key={i}
                    className={`rounded-xl border-2 px-4 py-3 text-sm ${
                      b.correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-bold text-gray-800 flex-1">Q{i + 1}. {b.question}</p>
                      {b.correct
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        : <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      }
                    </div>
                    <p className="text-gray-600">
                      <span className="font-bold">Your answer: </span>
                      <span className={b.correct ? 'text-green-700' : 'text-red-600'}>{studentLabel}</span>
                    </p>
                    {!b.correct && (
                      <p className="text-gray-600 mt-0.5">
                        <span className="font-bold">Correct: </span>{correctLabel}
                      </p>
                    )}
                    {b.type !== 'mcq' && (
                      <p className="text-xs text-gray-400 mt-1">Score: {Math.round(b.points * 100)}%</p>
                    )}
                  </div>
                  );
                })}
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
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-7 h-7 rounded-lg border-2 text-xs font-extrabold transition-all ${
                      i === current
                        ? 'bg-black text-white border-black'
                        : answers[i] !== undefined
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'border-gray-300 text-gray-400 hover:border-black'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
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
                  disabled={!allAnswered}
                  className="px-5 py-2.5 bg-[#FF6B57] text-black font-extrabold rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Submit
                </button>
              )}
            </div>
          )}

          {phase === 'result' && (
            <button
              onClick={() => onClose(result ?? undefined)}
              className="w-full py-3 bg-black text-white font-extrabold rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(99,102,241,0.4)] hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          )}

          {phase === 'error' && (
            <button
              onClick={() => onClose()}
              className="w-full py-3 border-2 border-black font-bold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
